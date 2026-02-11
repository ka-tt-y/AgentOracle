// Monitoring loop for Oracle Agent
import * as db from './db/mongo.js';
import {
  pingEndpoint,
  fetchAgentCard,
  ipfsToHttpUrl,
  getMonitoredAgentsFromSubgraph,
  getMonitoredAgentsFromContract,
  getResponseTrends,
  fetchReputationFromSubgraph,
  fetchReputationFromContract,
  healthAbi,
  reputationAbi,
} from './helpers.js';
import {
  validateResponseContent,
  makeHealthDecision,
  type ResponseValidation,
} from './llm/index.js';

export async function getMonitoredAgents(
  thegraphUrl: string,
  publicClient: any,
  healthMonitor: `0x${string}`
): Promise<{ agentId: bigint; endpoint: string }[]> {
  try {
    const agents = await getMonitoredAgentsFromSubgraph(thegraphUrl);
    console.log(`Found ${agents.length} monitored agents from subgraph`);
    if (agents.length > 0) return agents;
  } catch (error) {
    console.error('Error fetching from subgraph, falling back to contract reads:', error);
  }
  const agents = await getMonitoredAgentsFromContract(publicClient, healthMonitor);
  console.log(`Found ${agents.length} monitored agents from contract`);
  return agents;
}

export async function checkAndDecide(
  agentId: bigint,
  publicClient: any,
  walletClient: any,
  healthMonitor: `0x${string}`,
  identityRegistry: `0x${string}`,
  reputationRegistry: `0x${string}`,
  thegraphUrl: string,
  knownEndpoint?: string
) {
  try {
    const health: any = await publicClient.readContract({
      address: healthMonitor,
      abi: healthAbi,
      functionName: 'getHealthData',
      args: [agentId],
    });

    if (!health.isMonitored) return;

    const agentCard = await fetchAgentCard(agentId, publicClient, identityRegistry);

    let endpoint = knownEndpoint || '';
    if (!endpoint) {
      if (agentCard?.services) {
        const svc = agentCard.services.find((s: any) => ['status', 'health', 'ping'].includes(s.name));
        endpoint = svc?.endpoint || '';
      }
    }

    if (!endpoint) {
      console.log(`Agent ${agentId}: No status endpoint → skipping`);
      return;
    }

    const pingResult = await pingEndpoint(endpoint);
    const totalChecks = Number(health.totalChecks);
    const uptimePercent = totalChecks > 0
      ? (Number(health.successfulChecks) * 100) / totalChecks
      : 100; // New agent with no checks yet — default to 100%
    const avgResponseTime = Number(health.successfulChecks) > 0
      ? Number(health.totalResponseTime) / Number(health.successfulChecks)
      : 0;

    const trends = await getResponseTrends(agentId.toString());

    let responseValidation: ResponseValidation | undefined;
    if (pingResult.success && pingResult.data) {
      responseValidation = await validateResponseContent(endpoint, pingResult.data, agentCard);
    }

    // Reputation: try subgraph first, fallback to contract
    let reputationMean = 0;
    const repFromSubgraph = await fetchReputationFromSubgraph(thegraphUrl, agentId.toString());
    if (repFromSubgraph) {
      reputationMean = repFromSubgraph.reputationMean;
    } else {
      const repFromContract = await fetchReputationFromContract(publicClient, reputationRegistry, agentId.toString());
      reputationMean = repFromContract.reputationMean;
    }

    const decision = await makeHealthDecision(
      agentId.toString(),
      endpoint,
      pingResult,
      health,
      trends,
      responseValidation,
      agentCard
    );
    console.log(`Decision for agent ${agentId}:`, decision);

    await db.pushResponseHistory(agentId.toString(), {
      timestamp: Date.now(),
      responseTimeMs: pingResult.responseTimeMs,
      success: pingResult.success,
    });

    await db.upsertAgent({
      agentId: agentId.toString(),
      name: agentCard?.name || undefined,
      description: agentCard?.description || undefined,
      endpoint,
      imageUrl: ipfsToHttpUrl(agentCard?.image),
      healthScore: health.healthScore,
      consecutiveFailures: Number(health.consecutiveFailures),
      uptimePercent,
      avgResponseTimeMs: avgResponseTime,
      totalChecks,
      successfulChecks: Number(health.successfulChecks),
      reputationMean,
      feedbackCount: 0,
      isMonitored: true,
      lastChecked: Date.now(),
      lastDecision: decision.decision,
      lastReason: decision.reason,
      agentCard,
    });

    await db.logHealthEvent({
      agentId: agentId.toString(),
      decision: decision.decision,
      reason: decision.reason,
      healthScore: health.healthScore,
      responseTimeMs: pingResult.responseTimeMs,
      success: pingResult.success,
      failureType: decision.failureType ?? undefined,
      anomalyDetected: decision.anomalyDetected ?? undefined,
    });

    if (decision.decision === 'healthy') {
      await walletClient.writeContract({
        address: healthMonitor,
        abi: healthAbi,
        functionName: 'updateHealth',
        args: [agentId, BigInt(pingResult.responseTimeMs), true],
      });
      // Reset suspicious count on healthy decision
      await db.resetSuspiciousCount(agentId.toString());
    } else if (decision.decision === 'suspicious') {
      // Always record the health check
      await walletClient.writeContract({
        address: healthMonitor,
        abi: healthAbi,
        functionName: 'updateHealth',
        args: [agentId, BigInt(pingResult.responseTimeMs), pingResult.success],
      });
      
      // Track suspicious count - only slash after 6 consecutive suspicious decisions
      const shouldSlash = await db.incrementSuspiciousCount(agentId.toString(), 6);
      if (shouldSlash) {
        const reason = `${decision.reason}${decision.failureType !== 'none' ? ` [${decision.failureType}]` : ''}`;
        console.log(`Agent ${agentId}: 6 consecutive suspicious decisions - slashing 5%`);
        await walletClient.writeContract({
          address: healthMonitor,
          abi: healthAbi,
          functionName: 'reportSuspicious',
          args: [agentId, reason],
        });
      } else {
        const currentCount = await db.getSuspiciousCount(agentId.toString());
        console.log(`Agent ${agentId}: suspicious decision (${currentCount}/6 before slash)`);
      }
    } else if (decision.decision === 'critical') {
      await walletClient.writeContract({
        address: healthMonitor,
        abi: healthAbi,
        functionName: 'updateHealth',
        args: [agentId, 0n, false],
      });
    }
  } catch (err: any) {
    console.error(`Error processing agent ${agentId}: ${err.message || 'Unknown error'}`);
  }
}

export async function monitoringLoop(
  publicClient: any,
  walletClient: any,
  healthMonitor: `0x${string}`,
  identityRegistry: `0x${string}`,
  reputationRegistry: `0x${string}`,
  thegraphUrl: string
) {
  console.log('AgentOracle is active (Checking every 10 minutes)...');
  while (true) {
    try {
      const monitored = await getMonitoredAgents(thegraphUrl, publicClient, healthMonitor);
      console.log(`Found ${monitored.length} monitored agents`);

      for (const { agentId, endpoint } of monitored) {
        await checkAndDecide(agentId, publicClient, walletClient, healthMonitor, identityRegistry, reputationRegistry, thegraphUrl, endpoint);
      }
    } catch (err: any) {
      console.error('Agent failure:', err.message || 'Unknown error');
    }

    await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
  }
}
