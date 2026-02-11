// MongoDB persistence layer for Oracle Agent
import { MongoClient, Db, Collection } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Types ───────────────────────────────────────────────────────────
export interface AgentDocument {
  agentId: string;
  name?: string;
  description?: string;
  owner?: string;
  endpoint: string;
  imageUrl?: string;
  healthScore: number;
  consecutiveFailures: number;
  uptimePercent: number;
  avgResponseTimeMs: number;
  totalChecks: number;
  successfulChecks: number;
  reputationMean: number;
  feedbackCount: number;
  isMonitored: boolean;
  lastChecked: number;
  lastDecision?: string;
  lastReason?: string;
  responseHistory: { timestamp: number; responseTimeMs: number; success: boolean }[];
  agentCard?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCacheDocument {
  key: string;
  data: any;
  createdAt: Date;
  expiresAt: Date;
}

export interface HealthEventDocument {
  agentId: string;
  decision: string;
  reason: string;
  healthScore: number;
  responseTimeMs: number;
  success: boolean;
  failureType?: string;
  anomalyDetected?: boolean;
  timestamp: Date;
}

export interface ConfigDocument {
  key: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

// ─── MongoDB Connection ──────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'agent_oracle';
const Agent_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB: ${DB_NAME}`);

    // Create indexes
    await setupIndexes(db);

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

async function setupIndexes(database: Db): Promise<void> {
  // Agents collection
  const agents = database.collection<AgentDocument>('agents');
  await agents.createIndex({ agentId: 1 }, { unique: true });
  await agents.createIndex({ isMonitored: 1 });
  await agents.createIndex({ healthScore: -1 });
  await agents.createIndex({ lastChecked: -1 });

  // Agent Cache with TTL
  const AgentCache = database.collection<AgentCacheDocument>('AgentCache');
  await AgentCache.createIndex({ key: 1 }, { unique: true });
  await AgentCache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

  // Health events (for historical data)
  const healthEvents = database.collection<HealthEventDocument>('healthEvents');
  await healthEvents.createIndex({ agentId: 1, timestamp: -1 });
  await healthEvents.createIndex({ timestamp: -1 });

  // Config storage
  const config = database.collection<ConfigDocument>('config');
  await config.createIndex({ key: 1 }, { unique: true });

  console.log('📊 MongoDB indexes created');
}

export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('🔌 MongoDB disconnected');
  }
}

// ─── Agent Operations ────────────────────────────────────────────────
export async function getAgentsCollection(): Promise<Collection<AgentDocument>> {
  const database = await connectDB();
  return database.collection<AgentDocument>('agents');
}

export async function getAgent(agentId: string): Promise<AgentDocument | null> {
  const collection = await getAgentsCollection();
  return collection.findOne({ agentId });
}

export async function upsertAgent(agent: Partial<AgentDocument> & { agentId: string }): Promise<void> {
  const collection = await getAgentsCollection();
  await collection.updateOne(
    { agentId: agent.agentId },
    {
      $set: { ...agent, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

export async function getAllAgents(monitoredOnly = false): Promise<AgentDocument[]> {
  const collection = await getAgentsCollection();
  const filter = monitoredOnly ? { isMonitored: true } : {};
  return collection.find(filter).sort({ healthScore: -1 }).toArray();
}

/**
 * Fully remove all data for an agent from every collection.
 * Called when an agent unregisters.
 */
export async function deleteAgentData(agentId: string): Promise<{ deletedFrom: string[] }> {
  const deletedFrom: string[] = [];
  const database = await connectDB();

  // 1. agents collection
  const agentsResult = await database.collection('agents').deleteOne({ agentId });
  if (agentsResult.deletedCount > 0) deletedFrom.push('agents');

  // 2. healthEvents collection
  const eventsResult = await database.collection('healthEvents').deleteMany({ agentId });
  if (eventsResult.deletedCount > 0) deletedFrom.push(`healthEvents (${eventsResult.deletedCount})`);

  // 3. AgentCache — keys are prefixed with agentId
  const cacheResult = await database.collection('AgentCache').deleteMany({
    key: { $regex: `(^|_)${agentId}($|_)` },
  });
  if (cacheResult.deletedCount > 0) deletedFrom.push(`AgentCache (${cacheResult.deletedCount})`);

  // 4. suspicious_counts collection
  const suspResult = await database.collection('suspicious_counts').deleteOne({ agentId });
  if (suspResult.deletedCount > 0) deletedFrom.push('suspicious_counts');

  // 5. faucet_claims — not agent-specific, skip

  return { deletedFrom };
}

export async function getAgentsByHealthScore(limit = 10): Promise<AgentDocument[]> {
  const collection = await getAgentsCollection();
  return collection.find({ isMonitored: true }).sort({ healthScore: -1 }).limit(limit).toArray();
}

export async function pushResponseHistory(
  agentId: string,
  entry: { timestamp: number; responseTimeMs: number; success: boolean }
): Promise<void> {
  const collection = await getAgentsCollection();
  await collection.updateOne(
    { agentId },
    {
      $push: {
        responseHistory: {
          $each: [entry],
          $slice: -20, // Keep last 20 entries
        },
      } as any,
      $set: { updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

// ─── Agent Cache Operations ────────────────────────────────────────────
export async function getAgentCacheCollection(): Promise<Collection<AgentCacheDocument>> {
  const database = await connectDB();
  return database.collection<AgentCacheDocument>('AgentCache');
}

export async function getCachedAgent<T>(key: string): Promise<T | null> {
  const collection = await getAgentCacheCollection();
  const doc = await collection.findOne({ key });
  if (doc && doc.expiresAt > new Date()) {
    return doc.data as T;
  }
  return null;
}

export async function setCachedAgent(key: string, data: any): Promise<void> {
  const collection = await getAgentCacheCollection();
  const expiresAt = new Date(Date.now() + Agent_CACHE_TTL_SECONDS * 1000);
  await collection.updateOne(
    { key },
    { $set: { key, data, expiresAt, createdAt: new Date() } },
    { upsert: true }
  );
}

// ─── Health Events (Historical) ──────────────────────────────────────
export async function getHealthEventsCollection(): Promise<Collection<HealthEventDocument>> {
  const database = await connectDB();
  return database.collection<HealthEventDocument>('healthEvents');
}

export async function logHealthEvent(event: Omit<HealthEventDocument, 'timestamp'>): Promise<void> {
  const collection = await getHealthEventsCollection();
  await collection.insertOne({ ...event, timestamp: new Date() });
}

export async function getHealthHistory(agentId: string, limit = 50): Promise<HealthEventDocument[]> {
  const collection = await getHealthEventsCollection();
  return collection.find({ agentId }).sort({ timestamp: -1 }).limit(limit).toArray();
}

export async function getRecentHealthEvents(limit = 100): Promise<HealthEventDocument[]> {
  const collection = await getHealthEventsCollection();
  return collection.find().sort({ timestamp: -1 }).limit(limit).toArray();
}

// ─── Trend Analysis from DB ──────────────────────────────────────────
export async function getResponseTrends(agentId: string): Promise<{
  avgTime: number;
  stdDev: number;
  recentTrend: 'improving' | 'stable' | 'degrading';
}> {
  const agent = await getAgent(agentId);
  const history = agent?.responseHistory || [];
  
  if (history.length < 3) {
    return { avgTime: 0, stdDev: 0, recentTrend: 'stable' };
  }

  const times = history.filter(h => h.success).map(h => h.responseTimeMs);
  if (times.length === 0) return { avgTime: 0, stdDev: 0, recentTrend: 'degrading' };

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);

  // Compare recent (last 3) vs older
  const recent = times.slice(-3);
  const older = times.slice(0, -3);
  if (older.length === 0) return { avgTime, stdDev, recentTrend: 'stable' };

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const recentTrend = recentAvg < olderAvg * 0.8 ? 'improving' : recentAvg > olderAvg * 1.2 ? 'degrading' : 'stable';
  return { avgTime, stdDev, recentTrend };
}

// ─── Config Storage ──────────────────────────────────────────────────
export async function getConfigCollection(): Promise<Collection<ConfigDocument>> {
  const database = await connectDB();
  return database.collection<ConfigDocument>('config');
}

export async function getConfig<T>(key: string): Promise<T | null> {
  const collection = await getConfigCollection();
  const doc = await collection.findOne({ key });
  return doc ? (doc.value as T) : null;
}

export async function setConfig(key: string, value: any): Promise<void> {
  const collection = await getConfigCollection();
  await collection.updateOne(
    { key },
    {
      $set: { value, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

// ─── Faucet Claim Tracking ───────────────────────────────────────────
export interface FaucetClaimDocument {
  address: string;
  amount: number;
  txHash: string;
  claimedAt: Date;
}

export async function getFaucetClaimsCollection(): Promise<Collection<FaucetClaimDocument>> {
  const database = await connectDB();
  return database.collection<FaucetClaimDocument>('faucet_claims');
}

export async function hasFaucetClaim(address: string): Promise<boolean> {
  const collection = await getFaucetClaimsCollection();
  const claim = await collection.findOne({ address: address.toLowerCase() });
  return claim !== null;
}

export async function recordFaucetClaim(address: string, amount: number, txHash: string): Promise<void> {
  const collection = await getFaucetClaimsCollection();
  await collection.insertOne({
    address: address.toLowerCase(),
    amount,
    txHash,
    claimedAt: new Date(),
  });
}

// ─── Suspicious Count Tracking ───────────────────────────────────────
// Track consecutive suspicious decisions per agent to only slash after threshold
export interface SuspiciousCountDocument {
  agentId: string;
  consecutiveSuspicious: number;
  lastSuspiciousAt: Date;
  totalSuspicious: number;
  lastSlashedAt?: Date;
}

export async function getSuspiciousCountCollection(): Promise<Collection<SuspiciousCountDocument>> {
  const database = await connectDB();
  return database.collection<SuspiciousCountDocument>('suspicious_counts');
}

/**
 * Increment suspicious count for an agent. Returns true if threshold reached (should slash).
 * Resets count after slashing.
 */
export async function incrementSuspiciousCount(agentId: string, threshold = 6): Promise<boolean> {
  const collection = await getSuspiciousCountCollection();
  const result = await collection.findOneAndUpdate(
    { agentId },
    {
      $inc: { consecutiveSuspicious: 1, totalSuspicious: 1 },
      $set: { lastSuspiciousAt: new Date() },
      $setOnInsert: { agentId },
    },
    { upsert: true, returnDocument: 'after' }
  );
  
  const count = result?.consecutiveSuspicious || 0;
  
  // If threshold reached, reset counter and mark as slashed
  if (count >= threshold) {
    await collection.updateOne(
      { agentId },
      { $set: { consecutiveSuspicious: 0, lastSlashedAt: new Date() } }
    );
    return true; // Should slash
  }
  
  return false; // Don't slash yet
}

/**
 * Reset suspicious count when agent has a healthy check
 */
export async function resetSuspiciousCount(agentId: string): Promise<void> {
  const collection = await getSuspiciousCountCollection();
  await collection.updateOne(
    { agentId },
    { $set: { consecutiveSuspicious: 0 } }
  );
}

/**
 * Get current suspicious count for an agent
 */
export async function getSuspiciousCount(agentId: string): Promise<number> {
  const collection = await getSuspiciousCountCollection();
  const doc = await collection.findOne({ agentId });
  return doc?.consecutiveSuspicious || 0;
}
