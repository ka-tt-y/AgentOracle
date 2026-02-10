// Agent Oracle — Entry Point
// AI-powered agent that monitors health of other agents, provides trust assessments,
// and validates onboarding applications.

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import express from 'express';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as dotenv from 'dotenv';
import { PinataSDK } from 'pinata';
import { monadMainnet } from './chains.js';
import * as db from './db/mongo.js';
import { setupRoutes } from './routes.js';
import { monitoringLoop } from './monitoring.js';
import { autoRegisterMoltbook, startDailyStatsLoop } from './social.js';

dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────
const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const THEGRAPH_URL = process.env.THEGRAPH_URL!;
const API_PORT = Number(process.env.API_PORT) || 4000;

if (!PRIVATE_KEY || !GROQ_API_KEY || !THEGRAPH_URL) {
  throw new Error('Missing required env vars: PRIVATE_KEY, GROQ_API_KEY, THEGRAPH_URL');
}

// ─── Shared Clients ──────────────────────────────────────────────────
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const publicClient = createPublicClient({ chain: monadMainnet, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: monadMainnet, transport: http(RPC_URL) });

// ─── Contract Addresses ──────────────────────────────────────────────
const IDENTITY_REGISTRY = process.env.IDENTITY_REGISTRY_ADDRESS as `0x${string}`;
const HEALTH_MONITOR = process.env.HEALTH_MONITOR_ADDRESS as `0x${string}`;
const REPUTATION_REGISTRY = process.env.REPUTATION_REGISTRY_ADDRESS as `0x${string}`;
const ORACLE_TOKEN = process.env.ORACLE_TOKEN_ADDRESS as `0x${string}`;

console.log("IDENTITY_REGISTRY:", IDENTITY_REGISTRY);
console.log("HEALTH_MONITOR:", HEALTH_MONITOR);
console.log("REPUTATION_REGISTRY:", REPUTATION_REGISTRY);
console.log("ORACLE_TOKEN:", ORACLE_TOKEN);
console.log("THEGRAPH_URL:", THEGRAPH_URL);

// ─── Axios Retries ───────────────────────────────────────────────────
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    error.code === 'ECONNABORTED' ||
    (error.response?.status !== undefined && error.response.status >= 500),
});

// ─── Pinata ──────────────────────────────────────────────────────────
const pinata = process.env.PINATA_JWT
  ? new PinataSDK({ pinataJwt: process.env.PINATA_JWT, pinataGateway: process.env.PINATA_GATEWAY_URL })
  : null;

// ─── Express App ─────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Api-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Setup all API routes (with rate limiting + auth on POST endpoints)
setupRoutes(app, publicClient, walletClient, HEALTH_MONITOR, IDENTITY_REGISTRY, REPUTATION_REGISTRY, ORACLE_TOKEN, THEGRAPH_URL, pinata);

// ─── Start ───────────────────────────────────────────────────────────
async function startAgent() {
  await db.connectDB();

  app.listen(API_PORT, () => {
    console.log(`🌐 Trust API running at http://localhost:${API_PORT}`);
    console.log(`   GET  /health                  — agent liveness`);
    console.log(`   GET  /trust/:agentId          — full trust summary`);
    console.log(`   GET  /agents                  — monitored agents`);
    console.log(`   GET  /agents/:id/history      — health history`);
    console.log(`   GET  /leaderboard             — top agents`);
    console.log(`   POST /prepareOnboard          — validate + upload agent card (auth required)`);
    console.log(`   POST /agents/notify           — seed new agent in DB (auth required)`);
    console.log(`   POST /faucet                  — request test ORACLE tokens`);
  });

  monitoringLoop(publicClient, walletClient, HEALTH_MONITOR, IDENTITY_REGISTRY, REPUTATION_REGISTRY, THEGRAPH_URL)
    .catch(console.error);

  // Auto-register on Moltbook (stores API key in DB)
  await autoRegisterMoltbook();

  // Start Moltbook daily stats posting
  await startDailyStatsLoop();

  console.log('🤖 AgentOracleAgent started :)');
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await db.disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await db.disconnectDB();
  process.exit(0);
});

startAgent().catch((err) => {
  console.error('❌ Failed to start agent:', err);
  process.exit(1);
});
