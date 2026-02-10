// Social posting — Moltbook integration for AgentOracle
// Posts daily aggregate statistics to a Moltbook submolt.

import * as db from './db/mongo.js';

const MOLTBOOK_BASE = 'https://www.moltbook.com/api/v1';

let cachedMoltbookKey: string | null = null;
let cachedDefaultSubmolt: string | null = null;

async function getDefaultSubmolt(): Promise<string> {
  // Check DB for custom submolt
  if (!cachedDefaultSubmolt) {
    cachedDefaultSubmolt = await db.getConfig<string>('moltbook_default_submolt') || 'general';
  }
  // Env var can override
  return process.env.MOLTBOOK_SUBMOLT || cachedDefaultSubmolt;
}

async function getMoltbookKey(): Promise<string | null> {
  // Env var takes precedence (for manual override)
  if (process.env.MOLTBOOK_API_KEY) {
    return process.env.MOLTBOOK_API_KEY;
  }
  // Otherwise check DB cache
  if (cachedMoltbookKey) return cachedMoltbookKey;
  cachedMoltbookKey = await db.getConfig<string>('moltbook_api_key');
  return cachedMoltbookKey;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// ─── Moltbook API helpers ────────────────────────────────────────────

export async function moltbookPost(title: string, content: string, submolt?: string): Promise<boolean> {
  const apiKey = await getMoltbookKey();
  if (!apiKey) return false;

  const targetSubmolt = submolt || await getDefaultSubmolt();

  try {
    const res = await fetch(`${MOLTBOOK_BASE}/posts`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify({
        submolt: targetSubmolt,
        title,
        content,
      }),
    });

    if (res.status === 429) {
      const data: any = await res.json().catch(() => ({}));
      console.warn(`🦞 Moltbook rate limited — retry in ${data.retry_after_minutes || '?'} min`);
      return false;
    }

    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown');
      console.error(`🦞 Moltbook post failed (${res.status}):`, err);
      return false;
    }

    console.log('🦞 Posted to Moltbook successfully');
    return true;
  } catch (err) {
    console.error('🦞 Moltbook post error:', err);
    return false;
  }
}

// ─── Daily stats builder ─────────────────────────────────────────────

interface DailyStats {
  totalAgents: number;
  healthyCount: number;
  degradedCount: number;
  unhealthyCount: number;
  avgHealthScore: number;
  avgUptime: number;
  avgResponseTime: number;
  topAgent: { name: string; score: number } | null;
  totalChecksLast24h: number;
  suspiciousLast24h: number;
  criticalLast24h: number;
}

async function gatherDailyStats(): Promise<DailyStats> {
  const agents = await db.getAllAgents(true); // monitored only

  const healthyCount = agents.filter(a => (a.healthScore ?? 0) >= 80).length;
  const degradedCount = agents.filter(a => (a.healthScore ?? 0) >= 50 && (a.healthScore ?? 0) < 80).length;
  const unhealthyCount = agents.filter(a => (a.healthScore ?? 0) < 50).length;

  const avgHealthScore = agents.length > 0
    ? agents.reduce((sum, a) => sum + (a.healthScore ?? 0), 0) / agents.length
    : 0;

  const avgUptime = agents.length > 0
    ? agents.reduce((sum, a) => sum + (a.uptimePercent ?? 0), 0) / agents.length
    : 0;

  const avgResponseTime = agents.length > 0
    ? agents.reduce((sum, a) => sum + (a.avgResponseTimeMs ?? 0), 0) / agents.length
    : 0;

  // Top agent by health score
  const topAgent = agents.length > 0
    ? { name: agents[0].name || `Agent #${agents[0].agentId}`, score: agents[0].healthScore ?? 0 }
    : null;

  // Last 24h health events
  const recentEvents = await db.getRecentHealthEvents(500);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const last24h = recentEvents.filter(e => e.timestamp.getTime() > cutoff);

  const suspiciousLast24h = last24h.filter(e => e.decision === 'suspicious').length;
  const criticalLast24h = last24h.filter(e => e.decision === 'critical').length;

  return {
    totalAgents: agents.length,
    healthyCount,
    degradedCount,
    unhealthyCount,
    avgHealthScore,
    avgUptime,
    avgResponseTime,
    topAgent,
    totalChecksLast24h: last24h.length,
    suspiciousLast24h,
    criticalLast24h,
  };
}

function buildDailyPost(stats: DailyStats): { title: string; content: string } {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Health bar visualization
  const pctHealthy = stats.totalAgents > 0 ? Math.round((stats.healthyCount / stats.totalAgents) * 100) : 0;
  const pctDegraded = stats.totalAgents > 0 ? Math.round((stats.degradedCount / stats.totalAgents) * 100) : 0;
  const pctUnhealthy = stats.totalAgents > 0 ? Math.round((stats.unhealthyCount / stats.totalAgents) * 100) : 0;

  // Determine overall network emoji
  let networkEmoji = '🟢';
  if (stats.criticalLast24h > 0) networkEmoji = '🔴';
  else if (stats.suspiciousLast24h > 0 || pctUnhealthy > 20) networkEmoji = '🟡';

  const title = `${networkEmoji} AgentOracle Daily Report — ${date}`;

  const content = `${networkEmoji} **AgentOracle Network Status — ${date}**

📊 **Network Overview**
- Monitored agents: **${stats.totalAgents}**
- 🟢 Healthy: **${stats.healthyCount}** (${pctHealthy}%)  ·  🟡 Degraded: **${stats.degradedCount}** (${pctDegraded}%)  ·  🔴 Unhealthy: **${stats.unhealthyCount}** (${pctUnhealthy}%)

📈 **Performance (24h)**
- Avg health score: **${stats.avgHealthScore.toFixed(1)}/100**
- Avg uptime: **${stats.avgUptime.toFixed(1)}%**
- Avg response time: **${stats.avgResponseTime.toFixed(0)}ms**
- Total health checks: **${stats.totalChecksLast24h}**

🚨 **Incidents (24h)**
- Suspicious detections: **${stats.suspiciousLast24h}**
- Critical slashes: **${stats.criticalLast24h}**

${stats.topAgent ? `🏆 **Top agent:** ${stats.topAgent.name} (score: ${stats.topAgent.score})` : ''}

---
*Autonomous report by AgentOracle — AI-powered health monitoring on Monad.* \n
*Profile: [moltbook.com/u/AgentOracle](https://www.moltbook.com/u/AgentOracle)* \n
*View Stats on Dashboard: [agent-oracle.xyz/directory](https://agent-oracle.xyz/directory)*

#AgentOracle #monadMainnet #AIAgents #OnChainReputation`;

  return { title, content };
}

// ─── Auto-registration ───────────────────────────────────────────────

interface MoltbookRegistration {
  api_key: string;
  claim_url: string;
  verification_code: string;
}

/**
 * Register the agent on Moltbook if not already registered.
 * Stores API key in MongoDB for persistence across restarts.
 */
export async function autoRegisterMoltbook(): Promise<void> {
  // Check if already registered
  const existingKey = await db.getConfig<string>('moltbook_api_key');
  if (existingKey) {
    console.log('🦞 Moltbook already registered');
    cachedMoltbookKey = existingKey;
    
    // Check claim status
    try {
      const res = await fetch(`${MOLTBOOK_BASE}/agents/status`, {
        headers: authHeaders(existingKey),
      });
      const status: any = await res.json();
      if (status.status === 'pending_claim') {
        const claimUrl = await db.getConfig<string>('moltbook_claim_url');
        const verificationCode = await db.getConfig<string>('moltbook_verification_code');
        console.log('🦞 Moltbook registration pending — awaiting human claim:');
        console.log(`   Claim URL: ${claimUrl}`);
        console.log(`   Verification code: ${verificationCode}`);
      } else if (status.status === 'claimed') {
        console.log('🦞 Moltbook fully claimed and active ✅');
      }
    } catch (err) {
      console.error('🦞 Failed to check Moltbook claim status:', err);
    }
    return;
  }

  // Register for the first time
  try {
    console.log('🦞 Registering on Moltbook...');
    const res = await fetch(`${MOLTBOOK_BASE}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AgentOracle',
        description: 'Autonomous health monitor for agents on Monad. Posts daily network statistics.',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('🦞 Moltbook registration failed:', err);
      return;
    }

    const data = await res.json() as { agent: MoltbookRegistration };
    const { api_key, claim_url, verification_code } = data.agent;

    // Store credentials in MongoDB
    await db.setConfig('moltbook_api_key', api_key);
    await db.setConfig('moltbook_claim_url', claim_url);
    await db.setConfig('moltbook_verification_code', verification_code);
    cachedMoltbookKey = api_key;

    console.log('🦞 Moltbook registration successful! ✅');
    console.log('   ⚠️  HUMAN ACTION REQUIRED:');
    console.log(`   1. Visit: ${claim_url}`);
    console.log(`   2. Verify your email`);
    console.log(`   3. Tweet the verification code: "${verification_code}"`);
    console.log('   4. Your agent will be activated on Moltbook');
  } catch (err) {
    console.error('🦞 Moltbook registration error:', err);
  }
}

/**
 * Update the agent's Moltbook profile (description, metadata, etc.)
 */
export async function updateMoltbookProfile(updates: {
  description?: string;
  metadata?: any;
}): Promise<boolean> {
  const apiKey = await getMoltbookKey();
  if (!apiKey) {
    console.error('🦞 Not registered on Moltbook — cannot update profile');
    return false;
  }

  try {
    const res = await fetch(`${MOLTBOOK_BASE}/agents/me`, {
      method: 'PATCH',
      headers: authHeaders(apiKey),
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('🦞 Moltbook profile update failed:', err);
      return false;
    }

    console.log('🦞 Moltbook profile updated successfully ✅');
    return true;
  } catch (err) {
    console.error('🦞 Moltbook profile update error:', err);
    return false;
  }
}

/**
 * Create a new submolt (community) on Moltbook
 */
export async function createSubmolt(params: {
  name: string;
  display_name: string;
  description: string;
}): Promise<boolean> {
  const apiKey = await getMoltbookKey();
  if (!apiKey) {
    console.error('🦞 Not registered on Moltbook — cannot create submolt');
    return false;
  }

  try {
    const res = await fetch(`${MOLTBOOK_BASE}/submolts`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('🦞 Submolt creation failed:', err);
      return false;
    }

    console.log(`🦞 Submolt created: m/${params.name} ✅`);
    return true;
  } catch (err) {
    console.error('🦞 Submolt creation error:', err);
    return false;
  }
}

/**
 * Get your own posts from Moltbook by fetching from submolts
 * The API doesn't have a direct "my posts" endpoint, so we fetch from known submolts
 */
export async function getMyPosts(submolt: string = 'general'): Promise<any[]> {
  const apiKey = await getMoltbookKey();
  if (!apiKey) return [];

  try {
    // Get profile to find agent name
    const profileRes = await fetch(`${MOLTBOOK_BASE}/agents/me`, {
      headers: authHeaders(apiKey),
    });

    if (!profileRes.ok) {
      console.error(`🦞 Failed to fetch profile (${profileRes.status})`);
      return [];
    }
    
    const profileData: any = await profileRes.json();
    const myName = profileData.agent?.name;
    
    if (!myName) {
      console.error('🦞 Could not determine agent name');
      return [];
    }

    // Fetch posts from submolt
    const postsRes = await fetch(`${MOLTBOOK_BASE}/posts?submolt=${submolt}&limit=100`, {
      headers: authHeaders(apiKey),
    });

    if (!postsRes.ok) {
      console.error(`🦞 Failed to fetch posts from m/${submolt}`);
      return [];
    }

    const postsData: any = await postsRes.json();
    const allPosts = postsData.posts || [];
    
    // Filter to only my posts
    const myPosts = allPosts.filter((p: any) => p.author?.name === myName);
    console.log(`🦞 Found ${myPosts.length} of your posts in m/${submolt}`);
    
    return myPosts;
  } catch (err) {
    console.error('🦞 Failed to fetch posts:', err);
    return [];
  }
}

/**
 * Delete a post by ID
 */
export async function deletePost(postId: string): Promise<boolean> {
  const apiKey = await getMoltbookKey();
  if (!apiKey) return false;

  try {
    const res = await fetch(`${MOLTBOOK_BASE}/posts/${postId}`, {
      method: 'DELETE',
      headers: authHeaders(apiKey),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`🦞 Failed to delete post ${postId}:`, err);
      return false;
    }

    console.log(`🦞 Deleted post ${postId} ✅`);
    return true;
  } catch (err) {
    console.error('🦞 Delete post error:', err);
    return false;
  }
}

/**
 * Delete all your posts on Moltbook (searches in general and agentoracleai submolts)
 */
export async function deleteAllMyPosts(): Promise<number> {
  // Check both common submolts
  const generalPosts = await getMyPosts('general');
  const agentOraclePosts = await getMyPosts('agentoracleai');
  
  const allPosts = [...generalPosts, ...agentOraclePosts];
  
  // Deduplicate by ID
  const uniquePosts = Array.from(new Map(allPosts.map(p => [p.id, p])).values());
  
  let deleted = 0;

  for (const post of uniquePosts) {
    const success = await deletePost(post.id);
    if (success) deleted++;
    // Add small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`🦞 Deleted ${deleted}/${uniquePosts.length} posts`);
  return deleted;
}

// ─── Scheduled posting loop ──────────────────────────────────────────

export async function postDailyStats(): Promise<boolean> {
  const apiKey = await getMoltbookKey();
  if (!apiKey) {
    console.log('🦞 MOLTBOOK_API_KEY not set — skipping daily post');
    return false;
  }

  try {
    const stats = await gatherDailyStats();
    const { title, content } = buildDailyPost(stats);

    console.log('🦞 Posting daily stats to Moltbook...');
    const success = await moltbookPost(title, content);
    return success;
  } catch (err) {
    console.error('🦞 Failed to post daily stats:', err);
    return false;
  }
}


/**
 * Start the 24h posting loop. Call once at startup.
 * Posts immediately if it's been >24h since last post, then every 24h.
 */
export async function startDailyStatsLoop(): Promise<void> {
  const apiKey = await getMoltbookKey();
  if (!apiKey) {
    console.log('🦞 Moltbook not configured (no API key) — daily posts disabled');
    return;
  }

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Wait 10 minutes after startup before first post (let monitoring gather data first)
  const INITIAL_DELAY = 10 * 60 * 1000;

  console.log('🦞 Moltbook daily stats loop enabled — posting every 24h');

  // Ensure submolt exists
  const submoltName = await getDefaultSubmolt();
  await ensureSubmoltExists(submoltName);

  setTimeout(async () => {
    // First post after startup delay
    await postDailyStats();
    console.log(`First daily stats posted to Moltbook. Next post in 24h.`);

    // Then every 24h
    setInterval(async () => {
      await postDailyStats();
    }, TWENTY_FOUR_HOURS);
  }, INITIAL_DELAY);
}

/**
 * Ensure the submolt exists, create it if it doesn't
 */
async function ensureSubmoltExists(submoltName: string): Promise<void> {
  const apiKey = await getMoltbookKey();
  if (!apiKey) return;

  try {
    // Check if submolt exists by trying to fetch it
    const res = await fetch(`${MOLTBOOK_BASE}/submolts/${submoltName}`, {
      headers: authHeaders(apiKey),
    });

    if (res.ok) {
      console.log(`🦞 Submolt m/${submoltName} exists ✅`);
      return;
    }

    if (res.status === 404) {
      // Submolt doesn't exist, create it
      console.log(`🦞 Creating submolt m/${submoltName}...`);
      const created = await createSubmolt({
        name: submoltName,
        display_name: 'AgentOracle',
        description: 'Autonomous health monitoring and trust infrastructure for AI agents on Monad. Daily network statistics and agent health reports.',
      });
      if (created) {
        console.log(`🦞 Submolt m/${submoltName} created ✅`);
      }
    }
  } catch (err) {
    console.warn('🦞 Could not check/create submolt:', (err as Error).message);
  }
}
