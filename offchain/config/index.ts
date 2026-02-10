// Configuration and shared clients for Oracle Agent
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { ChatOpenAI } from '@langchain/openai';
import { PinataSDK } from "pinata";
import * as dotenv from 'dotenv';
import { monadMainnet } from '../chains.js';

dotenv.config();

// ─── Environment Variables ───────────────────────────────────────────
export const RPC_URL = process.env.RPC_URL!;
export const PRIVATE_KEY = process.env.PRIVATE_KEY!;
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
export const THEGRAPH_URL = process.env.THEGRAPH_URL!;
export const API_PORT = Number(process.env.API_PORT) || 4000;

// Validate required env vars
if (!PRIVATE_KEY || !DEEPSEEK_API_KEY || !THEGRAPH_URL) {
  throw new Error('Missing required env vars: PRIVATE_KEY, DEEPSEEK_API_KEY, THEGRAPH_URL');
}

// ─── Contract Addresses ──────────────────────────────────────────────
export const IDENTITY_REGISTRY = process.env.IDENTITY_REGISTRY_ADDRESS as `0x${string}`;
export const HEALTH_MONITOR = process.env.HEALTH_MONITOR_ADDRESS as `0x${string}`;
export const REPUTATION_REGISTRY = process.env.REPUTATION_REGISTRY_ADDRESS as `0x${string}`;

// ─── Shared Clients ──────────────────────────────────────────────────
export const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
export const publicClient = createPublicClient({ 
  chain: monadMainnet, 
  transport: http(RPC_URL) 
});
export const walletClient = createWalletClient({ 
  account, 
  chain: monadMainnet, 
  transport: http(RPC_URL) 
});

// ─── LLM Client ──────────────────────────────────────────────────────
export const llm = new ChatOpenAI({
  model: 'openai/gpt-oss-20b',
  temperature: 0.2,
  apiKey: DEEPSEEK_API_KEY,
  configuration: { baseURL: 'https://api.groq.com/openai/v1' },
  maxRetries: 3,
  maxTokens: 1024,
});

// ─── Pinata Client ───────────────────────────────────────────────────
export const pinata = process.env.PINATA_JWT 
  ? new PinataSDK({ 
      pinataJwt: process.env.PINATA_JWT, 
      pinataGateway: process.env.PINATA_GATEWAY_URL 
    })
  : null;

// ─── Axios Config ────────────────────────────────────────────────────
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    error.code === 'ECONNABORTED' ||
    (error.response?.status !== undefined && error.response.status >= 500),
});

export { axios };

// ─── ABIs (lazy-loaded) ──────────────────────────────────────────────
let _identityAbi: any = null;
let _healthAbi: any = null;
let _reputationAbi: any = null;
let _validationAbi: any = null;

export async function loadABIs() {
  if (_identityAbi) return { identityAbi: _identityAbi, healthAbi: _healthAbi, reputationAbi: _reputationAbi, validationAbi: _validationAbi };
  
  const [identityArtifact, healthArtifact, reputationArtifact] = await Promise.all([
    import('../../artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json', { with: { type: 'json' } }),
    import('../../artifacts/contracts/HealthMonitor.sol/HealthMonitor.json', { with: { type: 'json' } }),
    import('../../artifacts/contracts/ReputationRegistry.sol/ReputationRegistry.json', { with: { type: 'json' } }),
  ]);
  
  _identityAbi = identityArtifact.default.abi;
  _healthAbi = healthArtifact.default.abi;
  _reputationAbi = reputationArtifact.default.abi;
  
  return { identityAbi: _identityAbi, healthAbi: _healthAbi, reputationAbi: _reputationAbi, validationAbi: _validationAbi };
}
