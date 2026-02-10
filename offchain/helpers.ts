// Helper functions for Oracle Agent
import axios from 'axios';
import * as db from './db/mongo.js';
import type { PingResult, MonitoredAgent, SubgraphAgent } from './types.js';

// ─── Contract ABIs ───────────────────────────────────────────────────
const { default: identityArtifact } = await import('../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json', { with: { type: 'json' } });
const { default: healthArtifact } = await import('../artifacts/contracts/HealthMonitor.sol/HealthMonitor.json', { with: { type: 'json' } });
const { default: reputationArtifact } = await import('../artifacts/contracts/ReputationRegistry.sol/ReputationRegistry.json', { with: { type: 'json' } });

export const identityAbi = identityArtifact.abi;
export const healthAbi = healthArtifact.abi;
export const reputationAbi = reputationArtifact.abi;

// ─── Cache helpers ───────────────────────────────────────────────────
export async function getAgentFromCache(agentId: string): Promise<db.AgentDocument | null> {
  return db.getAgent(agentId);
}

export async function getResponseTrends(agentId: string) {
  return db.getResponseTrends(agentId);
}

// ─── IPFS helpers ────────────────────────────────────────────────────
export function ipfsToHttpUrl(imageUri: string | undefined): string | undefined {
  if (!imageUri) return undefined;
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return imageUri;
  }
  const hash = imageUri.replace('ipfs://', '');
  if (!hash) return undefined;
  if (process.env.PINATA_GATEWAY_URL) {
    return `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${hash}`;
  }
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
}

// ─── Endpoint helpers ────────────────────────────────────────────────
export async function pingEndpoint(endpoint: string): Promise<PingResult> {
  const start = Date.now();
  try {
    const res = await axios.get(endpoint, { timeout: 10000 });
    return { success: res.status >= 200 && res.status < 300, responseTimeMs: Date.now() - start, data: res.data };
  } catch {
    return { success: false, responseTimeMs: Date.now() - start, data: null };
  }
}

// ─── Agent card fetching ─────────────────────────────────────────────
export async function fetchAgentCard(
  agentId: bigint,
  publicClient: any,
  identityRegistry: `0x${string}`
): Promise<any> {
  try {
    const uri = (await publicClient.readContract({
      address: identityRegistry,
      abi: identityAbi,
      functionName: 'tokenURI',
      args: [agentId],
    })) as string;

    if (!uri || uri === '') {
      console.log(`Agent ${agentId} has no URI (not registered through registerFor)`);
      return null;
    }

    const hash = uri.replace('ipfs://', '');
    if (!hash) return null;

    const gateways = [
      process.env.PINATA_GATEWAY_URL ? `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${hash}` : null,
      `https://gateway.pinata.cloud/ipfs/${hash}`,
      `https://cloudflare-ipfs.com/ipfs/${hash}`,
      `https://dweb.link/ipfs/${hash}`,
    ].filter(Boolean) as string[];

    for (const gateway of gateways) {
      try {
        const res = await axios.get(gateway, { timeout: 10000 });
        console.log(`✓ Fetched agent card for ${agentId} from ${gateway.split('/')[2]}`);
        return res.data;
      } catch {
        continue;
      }
    }

    console.warn(`⚠ All IPFS gateways failed for agent ${agentId} (hash: ${hash}).`);
    return null;
  } catch (err: any) {
    console.warn(`⚠ Failed to fetch Agent Card for ${agentId}: ${err.message || 'Unknown error'}`);
    return null;
  }
}

// ─── Subgraph queries ────────────────────────────────────────────────
export async function getMonitoredAgentsFromSubgraph(
  thegraphUrl: string
): Promise<MonitoredAgent[]> {
  const response = await axios.post(thegraphUrl, {
    query: `
      query GetMonitoredAgents {
        monitoredAgents(first: 100, where: { isActive: true }) {
          id
          agentId
          endpoint
          stakedAmount
          lastCheckTimestamp
        }
      }
    `
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.data?.data?.monitoredAgents) {
    throw new Error('Invalid subgraph response');
  }

  return response.data.data.monitoredAgents.map((a: any) => ({
    agentId: BigInt(a.agentId),
    endpoint: a.endpoint
  }));
}

export async function getMonitoredAgentsFromContract(
  publicClient: any,
  healthMonitor: `0x${string}`
): Promise<MonitoredAgent[]> {
  const agents: MonitoredAgent[] = [];
  for (let id = 0; id < 20; id++) {
    try {
      const health: any = await publicClient.readContract({
        address: healthMonitor,
        abi: healthAbi,
        functionName: 'getHealthData',
        args: [BigInt(id)],
      });
      if (health.isMonitored && health.endpoint) {
        agents.push({ agentId: BigInt(id), endpoint: health.endpoint });
      }
    } catch { /* continue */ }
  }
  return agents;
}

export async function fetchSubgraphAgent(
  thegraphUrl: string,
  agentId: string
): Promise<{ agent: SubgraphAgent | null; healthEvents: any[] }> {
  try {
    const sgResponse = await axios.post(thegraphUrl, {
      query: `{
        monitoredAgent(id: "${agentId}") {
          id
          agentId
          endpoint
          healthScore
          consecutiveFailures
          successfulChecks
          totalChecks
          totalSlashed
          suspiciousCount
          lastCheckTimestamp
          stakedAmount
          isActive
        }
        healthUpdateds(
          first: 50
          where: { agentId: "${agentId}" }
          orderBy: blockTimestamp
          orderDirection: desc
        ) {
          id
          agentId
          blockTimestamp
          oldScore
          newScore
          success
          responseTime
        }
      }`
    });
    return {
      agent: sgResponse.data?.data?.monitoredAgent || null,
      healthEvents: sgResponse.data?.data?.healthUpdateds || [],
    };
  } catch (err) {
    console.warn('Subgraph fetch failed:', (err as Error).message);
    return { agent: null, healthEvents: [] };
  }
}

export async function fetchReputationFromSubgraph(
  thegraphUrl: string,
  agentId: string
): Promise<{ reputationMean: number; reputationCount: number } | null> {
  try {
    const sgResponse = await axios.post(thegraphUrl, {
      query: `{
        reputationSummary(id: "${agentId}") {
          count
          sum
          mean
        }
      }`
    });
    const rep = sgResponse.data?.data?.reputationSummary;
    if (rep) {
      return {
        reputationCount: Number(rep.count),
        reputationMean: Number(rep.mean) / 1e18,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchReputationFromContract(
  publicClient: any,
  reputationRegistry: `0x${string}`,
  agentId: string
): Promise<{ reputationMean: number; reputationCount: number }> {
  try {
    const repSummary: any = await publicClient.readContract({
      address: reputationRegistry,
      abi: reputationAbi,
      functionName: 'getSummary',
      args: [BigInt(agentId)],
    });
    return {
      reputationCount: Number(repSummary[0]),
      reputationMean: Number(repSummary[2]) / 1e18,
    };
  } catch {
    return { reputationMean: 0, reputationCount: 0 };
  }
}

export async function getAgentHealthFromContract(
  publicClient: any,
  healthMonitor: `0x${string}`,
  agentId: string
): Promise<SubgraphAgent> {
  const health: any = await publicClient.readContract({
    address: healthMonitor,
    abi: healthAbi,
    functionName: 'getHealthData',
    args: [BigInt(agentId)],
  });
  return {
    agentId,
    endpoint: health.endpoint,
    healthScore: Number(health.healthScore),
    consecutiveFailures: Number(health.consecutiveFailures),
    successfulChecks: Number(health.successfulChecks),
    totalChecks: Number(health.totalChecks),
    totalSlashed: '0',
    suspiciousCount: 0,
    lastCheckTimestamp: '0',
    stakedAmount: health.stakedAmount.toString(),
    isActive: health.isMonitored,
  };
}
