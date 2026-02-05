// autonomous-monitor.ts
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from "langchain";
import { pull } from 'langchain/hub';
import * as dotenv from 'dotenv';
import { request, gql } from 'graphql-request';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const THEGRAPH_URL = process.env.THEGRAPH_URL!; 

if (!PRIVATE_KEY || !DEEPSEEK_API_KEY || !THEGRAPH_URL) {
  throw new Error('Missing required env vars: PRIVATE_KEY, DEEPSEEK_API_KEY, THEGRAPH_URL');
}

const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const publicClient = createPublicClient({ transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

// Contract addresses (update after deploy)
const IDENTITY_REGISTRY = process.env.IDENTITY_REGISTRY_ADDRESS as `0x${string}`;
const HEALTH_MONITOR = process.env.HEALTH_MONITOR_ADDRESS as `0x${string}`;

// ABIs 

import identityAbi from '../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json' with { type: 'json' };
import healthAbi from '../artifacts/contracts/HealthMonitor.sol/HealthMonitor.json' with { type: 'json' };

// Axios retries (3 attempts, exponential backoff)
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => error.code === 'ECONNABORTED' || error.response?.status >= 500
});

const llm = new ChatOpenAI({
  model: 'deepseek-reasoner',
  temperature: 0.2,
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
  maxRetries: 3,
  maxTokens: 1024,
});

// TheGraph query for active monitored agents
const MONITORED_AGENTS_QUERY = gql`
  query GetMonitoredAgents {
    monitoredAgents(first: 100, where: { isMonitored: true }) {  # Add isMonitored filter if you indexed it
      id
      agentId
      endpoint
      stakedAmount
      timestamp
    }
  }
`;

async function getMonitoredAgents(): Promise<{ agentId: bigint; endpoint: string }[]> {
  try {
    const data = await request<{ monitoredAgents: { agentId: string; endpoint: string }[] }>(
      THEGRAPH_URL,
      MONITORED_AGENTS_QUERY
    );
    return data.monitoredAgents.map(a => ({
      agentId: BigInt(a.agentId),
      endpoint: a.endpoint
    }));
  } catch (err) {
    console.error('TheGraph query failed:', err);
    return []; // fallback to empty → don't crash loop
  }
}

async function fetchAgentCard(agentId: bigint): Promise<any> {
  try {
    const uri = await publicClient.readContract({
      address: IDENTITY_REGISTRY,
      abi: identityAbi,
      functionName: 'tokenURI',
      args: [agentId]
    }) as string;

    if (!uri) return null;

    const ipfsUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    const res = await axios.get(ipfsUrl, { timeout: 10000 });
    return res.data;
  } catch (err) {
    console.error(`Failed to fetch Agent Card for ${agentId}:`, err);
    return null;
  }
}

async function pingEndpoint(endpoint: string): Promise<{ success: boolean; responseTimeMs: number; data: any }> {
  const start = Date.now();
  try {
    const res = await axios.get(endpoint, { timeout: 10000 });
    return {
      success: res.status >= 200 && res.status < 300,
      responseTimeMs: Date.now() - start,
      data: res.data
    };
  } catch (err: any) {
    return { success: false, responseTimeMs: Date.now() - start, data: null };
  }
}

async function decideWithRetry(prompt: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const promptTemplate = await pull('hwchase17/react');
            const agent = await createAgent({
  llm,
  tools: [],
  prompt: await pull("hwchase17/react"),
});
      const result = await agent.invoke({ input: prompt });
      return JSON.parse(result.output);
    } catch (err) {
      console.warn(`LLM attempt ${attempt} failed:`, err);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error('LLM max retries exceeded');
}

async function checkAndDecide(agentId: bigint, knownEndpoint?: string) {
  try {
    // Get current health
    const health: any = await publicClient.readContract({
      address: HEALTH_MONITOR,
      abi: healthAbi,
      functionName: 'getHealthData',
      args: [agentId]
    });

    if (!health.isMonitored) return;

    let endpoint = knownEndpoint || '';
    if (!endpoint) {
      const card = await fetchAgentCard(agentId);
      if (card?.services) {
        const statusSvc = card.services.find((s: any) => ['status', 'health', 'ping'].includes(s.name));
        endpoint = statusSvc?.endpoint || '';
      }
    }

    if (!endpoint) {
      console.log(`Agent ${agentId}: No status endpoint → skipping`);
      return;
    }

    const pingResult = await pingEndpoint(endpoint);

    // AI decision with retry
    const prompt = `Current health: score=${health.healthScore}, failures=${health.consecutiveFailures}, uptime=${(Number(health.successfulChecks) * 100 / Number(health.totalChecks || 1)).toFixed(2)}%
Ping: success=${pingResult.success}, time=${pingResult.responseTimeMs}ms, response=${JSON.stringify(pingResult.data || 'failed')}

You are AuthUptimeAgent – autonomous trust validator.
Decide:
- "healthy" → update up
- "suspicious" → report + reason
- "critical" → low score + slash consideration

Output ONLY JSON: { "decision": "...", "reason": "...", "slashPercent": number? }`;

    const decision = await decideWithRetry(prompt);

    console.log(`Decision for ${agentId}:`, decision);

    // Act
    if (decision.decision === 'healthy') {
      await walletClient.writeContract({
        address: HEALTH_MONITOR,
        abi: healthAbi,
        functionName: 'updateHealth',
        args: [agentId, BigInt(pingResult.responseTimeMs), pingResult.success]
      });
    } else if (decision.decision === 'suspicious') {
      await walletClient.writeContract({
        address: HEALTH_MONITOR,
        abi: healthAbi,
        functionName: 'reportSuspicious',
        args: [agentId, decision.reason || 'Suspicious activity']
      });
    } else if (decision.decision === 'critical') {
      await walletClient.writeContract({
        address: HEALTH_MONITOR,
        abi: healthAbi,
        functionName: 'updateHealth',
        args: [agentId, 0n, false]
      });
      // Optional: add full slash call if you extend HealthMonitor
    }
  } catch (err) {
    console.error(`Error processing agent ${agentId}:`, err);
    // Continue to next agent
  }
}

async function mainLoop() {
  console.log('AuthUptimeAgent autonomous loop started...');
  while (true) {
    try {
      const monitored = await getMonitoredAgents();
      console.log(`Found ${monitored.length} monitored agents via TheGraph`);

      for (const { agentId, endpoint } of monitored) {
        await checkAndDecide(agentId, endpoint);
      }
    } catch (err) {
      console.error('Main loop error:', err);
    }

    await new Promise(r => setTimeout(r, 5 * 60 * 1000)); // 5 minutes
  }
}

mainLoop().catch(console.error);