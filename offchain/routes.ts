// API routes for Oracle Agent
import express from 'express';
import { parseUnits } from 'viem';
import * as db from './db/mongo.js';
import {
  getAgentFromCache,
  getResponseTrends,
  fetchSubgraphAgent,
  fetchReputationFromSubgraph,
  fetchReputationFromContract,
  getAgentHealthFromContract,
  healthAbi,
  ipfsToHttpUrl,
} from './helpers.js';
import {
  generateTrustNarrative,
  validateOnboardingData,
} from './llm/index.js';
import type { PinataSDK } from 'pinata';

// ─── Simple in-memory rate limiter ───────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString());
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    entry.count++;
    return next();
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 60_000);

// ─── API key authentication middleware ───────────────────────────────
function authenticateApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.API_SECRET_KEY;

  // If no API_SECRET_KEY is set, allow all requests (dev mode)
  if (!expectedKey) return next();

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid X-Api-Key header.' });
  }
  next();
}

// ─── Rate limit presets ──────────────────────────────────────────────
const getEndpointRateLimit = rateLimit(60, 60_000); // 60 req/min for GET endpoints
const postEndpointRateLimit = rateLimit(10, 60_000); // 10 req/min for POST endpoints

// ─── Route setup ─────────────────────────────────────────────────────
export function setupRoutes(
  app: express.Application,
  publicClient: any,
  walletClient: any,
  healthMonitor: `0x${string}`,
  identityRegistry: `0x${string}`,
  reputationRegistry: `0x${string}`,
  oracleToken: `0x${string}`,
  thegraphUrl: string,
  pinata: InstanceType<typeof PinataSDK> | null
) {
  // ERC-20 minimal ABI for faucet transfers
  const erc20Abi = [
    { type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
    { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  ] as const;
  // GET /health — agent's own liveness
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', agent: 'AgentOracleAgent', uptime: process.uptime() });
  });

  // GET /trust/:agentId — full trust summary
  app.get('/trust/:agentId', getEndpointRateLimit, async (req, res) => {
    const agentId = req.params.agentId as string;

    try {
      // Fetch from subgraph first
      const { agent: subgraphData, healthEvents } = await fetchSubgraphAgent(thegraphUrl, agentId);

      // Fallback to contract if subgraph didn't return data
      const subgraphAgent = subgraphData || await getAgentHealthFromContract(publicClient, healthMonitor, agentId);

      // Get response time trends
      const trends = await getResponseTrends(agentId);

      // Get agent metadata from DB
      const dbAgent = await db.getAgent(agentId);

      // Reputation: try subgraph first, fallback to contract
      let reputationMean = 0;
      let reputationCount = 0;
      const repFromSubgraph = await fetchReputationFromSubgraph(thegraphUrl, agentId);
      if (repFromSubgraph) {
        reputationMean = repFromSubgraph.reputationMean;
        reputationCount = repFromSubgraph.reputationCount;
      } else {
        const repFromContract = await fetchReputationFromContract(publicClient, reputationRegistry, agentId);
        reputationMean = repFromContract.reputationMean;
        reputationCount = repFromContract.reputationCount;
      }

      // Get cached decision
      const cached = await getAgentFromCache(agentId);

      // Compute derived fields
      const score = Number(subgraphAgent.healthScore);
      const totalChecks = Number(subgraphAgent.totalChecks) || 1;
      const successfulChecks = Number(subgraphAgent.successfulChecks);
      const uptimePercent = (successfulChecks * 100) / totalChecks;
      const trustLevel = score >= 90 ? 'High' : score >= 70 ? 'Medium' : score >= 40 ? 'Low' : 'Critical';

      // Build health object for LLM narrative
      const healthForNarrative = {
        healthScore: score,
        totalChecks,
        successfulChecks,
        consecutiveFailures: Number(subgraphAgent.consecutiveFailures),
        endpoint: subgraphAgent.endpoint,
        stakedAmount: BigInt(subgraphAgent.stakedAmount),
        isMonitored: subgraphAgent.isActive,
      };

      // Generate LLM trust narrative
      const narrative = await generateTrustNarrative(
        agentId,
        healthForNarrative,
        { mean: reputationMean, count: reputationCount },
        cached
      );

      // Build health score history from subgraph events or fall back
      let healthHistory: { timestamp: string; healthScore: number; decision: string; reason?: string }[] = [];
      if (healthEvents.length > 0) {
        healthHistory = healthEvents.map((e: any) => ({
          timestamp: new Date(Number(e.timestamp) * 1000).toISOString(),
          healthScore: Number(e.newHealthScore),
          decision: e.decision,
          reason: e.reason,
        }));
      } else {
        const dbHealthEvents = await db.getHealthHistory(agentId, 50);
        healthHistory = dbHealthEvents.map((e) => ({
          timestamp: e.timestamp.toISOString(),
          healthScore: e.healthScore,
          decision: e.decision,
          reason: e.reason,
        }));
      }

      res.json({
        agentId,
        name: dbAgent?.name || null,
        description: dbAgent?.description || null,
        imageUrl: dbAgent?.imageUrl || null,
        healthScore: score,
        uptimePercent: Number(uptimePercent.toFixed(2)),
        avgResponseTimeMs: Number(trends.avgTime.toFixed(2)),
        totalChecks,
        successfulChecks,
        consecutiveFailures: Number(subgraphAgent.consecutiveFailures),
        isMonitored: subgraphAgent.isActive,
        endpoint: subgraphAgent.endpoint,
        stakedAmount: subgraphAgent.stakedAmount,
        totalSlashed: subgraphAgent.totalSlashed || '0',
        suspiciousCount: Number(subgraphAgent.suspiciousCount || 0),
        reputationMean,
        reputationCount,
        trustLevel,
        lastDecision: cached?.lastDecision || null,
        lastReason: cached?.lastReason || null,
        lastChecked: cached?.lastChecked ? new Date(cached.lastChecked).toISOString() : null,
        narrative: {
          summary: narrative.summary,
          strengths: narrative.strengths,
          concerns: narrative.concerns,
          recommendation: narrative.recommendation,
          riskLevel: narrative.riskLevel,
        },
        trends: {
          avgResponseTime: Number(trends.avgTime.toFixed(2)),
          stdDeviation: Number(trends.stdDev.toFixed(2)),
          recentTrend: trends.recentTrend,
        },
        healthHistory,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch trust data', details: (err as Error).message });
    }
  });

  // GET /agents — list all monitored agents from DB
  app.get('/agents', getEndpointRateLimit, async (_req, res) => {
    try {
      const agents = await db.getAllAgents(true);
      const transformed = agents.map(a => ({
        agentId: a.agentId,
        name: a.name || null,
        description: a.description || null,
        endpoint: a.endpoint || null,
        owner: a.owner || null,
        imageUrl: a.imageUrl || null,
        healthScore: a.healthScore ?? 100,
        uptime: (a.totalChecks ?? 0) > 0 ? ((a.successfulChecks ?? 0) / a.totalChecks) * 100 : 100,
        avgResponseTime: a.avgResponseTimeMs ?? 0,
        reputation: a.reputationMean ?? 0,
        feedbackCount: a.feedbackCount ?? 0,
        lastCheck: a.lastChecked ? new Date(a.lastChecked).toISOString() : new Date().toISOString(),
        status: a.healthScore >= 80 ? 'healthy' : a.healthScore >= 50 ? 'degraded' : 'unhealthy',
        totalChecks: a.totalChecks ?? 0,
        successfulChecks: a.successfulChecks ?? 0,
        failedChecks: (a.totalChecks ?? 0) - (a.successfulChecks ?? 0),
      }));
      res.json(transformed);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch agents', details: (err as Error).message });
    }
  });

  // GET /agents/:agentId/history — health event history
  app.get('/agents/:agentId/history', getEndpointRateLimit, async (req, res) => {
    try {
      const agentId = req.params.agentId as string;
      const limit = Number(req.query.limit) || 50;
      const history = await db.getHealthHistory(agentId, limit);
      res.json({ agentId, count: history.length, history });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch history', details: (err as Error).message });
    }
  });

  // GET /leaderboard — top agents by health score
  app.get('/leaderboard', getEndpointRateLimit, async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const agents = await db.getAgentsByHealthScore(limit);
      const transformed = agents.map((a, idx) => ({
        rank: idx + 1,
        agentId: a.agentId,
        name: a.name || null,
        healthScore: a.healthScore ?? 100,
        uptime: (a.totalChecks ?? 0) > 0 ? ((a.successfulChecks ?? 0) / a.totalChecks) * 100 : 100,
        reputation: a.reputationMean ?? 0,
        feedbackCount: a.feedbackCount ?? 0,
        totalChecks: a.totalChecks ?? 0,
      }));
      res.json(transformed);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch leaderboard', details: (err as Error).message });
    }
  });

  // POST /prepareOnboard — validate + upload agent card to IPFS (requires API key)
  app.post('/prepareOnboard', postEndpointRateLimit, authenticateApiKey, async (req, res) => {
    if (!pinata) {
      return res.status(503).json({ error: 'Pinata not configured — set PINATA_JWT in .env' });
    }

    const { name, description, endpoint, capabilities, image } = req.body;
    if (!name || !endpoint) {
      return res.status(400).json({ error: 'Missing required fields: name, endpoint' });
    }

    const validation = await validateOnboardingData(
      name,
      description || '',
      endpoint,
      capabilities || []
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Agent card validation failed',
        validation: {
          isValid: validation.isValid,
          readinessScore: validation.readinessScore,
          issues: validation.issues,
          suggestions: validation.suggestions,
          duplicateRisk: validation.duplicateRisk,
          generatedDescription: validation.generatedDescription,
        },
        message: 'Please fix the issues and try again.',
      });
    }

    const finalDescription = description || validation.generatedDescription || `${name} agent`;

    const metadata: Record<string, any> = {
      name,
      description: finalDescription,
      services: [{ name: 'status', endpoint }],
      capabilities: capabilities || [],
      validation: {
        readinessScore: validation.readinessScore,
        validatedAt: new Date().toISOString(),
      },
    };

    if (image) {
      metadata.image = image;
    }

    try {
      const uploadRes = await pinata.upload.public.json(metadata).name(`${name}-agent-card.json`);
      const uri = `ipfs://${uploadRes.cid}`;
      res.json({
        uri,
        validation: {
          isValid: true,
          readinessScore: validation.readinessScore,
          suggestions: validation.suggestions,
          duplicateRisk: validation.duplicateRisk,
        },
        metadata,
        message: `Agent card uploaded successfully. Use this URI when calling onboardAgent on HealthMonitor: ${identityRegistry}`,
      });
    } catch (err) {
      res.status(500).json({ error: 'Pinata upload failed', details: (err as Error).message });
    }
  });

  // POST /agents/notify — seed DB immediately after on-chain registration
  // This lets the new agent appear in the directory without waiting for the monitoring loop
  app.post('/agents/notify', postEndpointRateLimit, authenticateApiKey, async (req, res) => {
    const { txHash, name, description, endpoint, owner, image, stakeAmount } = req.body;
    if (!txHash || !endpoint) {
      return res.status(400).json({ error: 'Missing required fields: txHash, endpoint' });
    }

    try {
      // Wait for the tx receipt and extract agentId from MonitoringEnabled event
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

      // Find the MonitoringEnabled event from HealthMonitor contract
      // MonitoringEnabled(uint256 indexed agentId, string endpoint, uint256 stakedAmount)
      // topics[0] = event sig hash, topics[1] = indexed agentId
      const relevantLog = receipt.logs.find(
        (log: any) => log.address.toLowerCase() === healthMonitor.toLowerCase() && log.topics.length >= 2
      );

      let agentId: string;
      if (relevantLog && relevantLog.topics[1]) {
        // topics[1] is the indexed agentId (uint256, padded to 32 bytes)
        agentId = BigInt(relevantLog.topics[1]).toString();
      } else {
        // Fallback: use tx hash as temporary ID (monitoring loop will fix later)
        console.warn('Could not extract agentId from tx receipt, using txHash as fallback');
        agentId = txHash;
      }

      await db.upsertAgent({
        agentId,
        name: name || undefined,
        description: description || undefined,
        endpoint,
        owner: owner || undefined,
        imageUrl: ipfsToHttpUrl(image),
        healthScore: 100,
        consecutiveFailures: 0,
        uptimePercent: 100,
        avgResponseTimeMs: 0,
        totalChecks: 0,
        successfulChecks: 0,
        reputationMean: 0,
        feedbackCount: 0,
        isMonitored: true,
        lastChecked: Date.now(),
        lastDecision: 'pending',
        lastReason: 'Newly registered — awaiting first health check',
      });

      res.json({ success: true, agentId, message: 'Agent seeded in directory' });
    } catch (err) {
      console.error('Error seeding agent:', err);
      res.status(500).json({ error: 'Failed to seed agent', details: (err as Error).message });
    }
  });

  // POST /faucet — transfer test ORACLE tokens to a wallet (testnet only)
  app.post('/faucet', postEndpointRateLimit, async (req, res) => {
    const { recipient, amount } = req.body;
    if (!recipient) {
      return res.status(400).json({ error: 'Missing required field: recipient' });
    }

    const tokenAmount = Number(amount) || 15;
    if (tokenAmount > 100) {
      return res.status(400).json({ error: 'Max faucet amount is 100 ORACLE per request' });
    }

    if (!oracleToken) {
      return res.status(503).json({ error: 'OracleToken address not configured' });
    }

    try {
      const txHash = await walletClient.writeContract({
        address: oracleToken,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, parseUnits(tokenAmount.toString(), 18)],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        res.json({ success: true, txHash, amount: tokenAmount });
      } else {
        res.status(500).json({ error: 'Transaction failed on-chain' });
      }
    } catch (err) {
      console.error('Faucet transfer error:', err);
      res.status(500).json({ error: 'Faucet transfer failed', details: (err as Error).message });
    }
  });
}
