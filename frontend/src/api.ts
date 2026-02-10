// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const API_SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY || ''

// Helper: headers for authenticated POST requests
function authHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (API_SECRET_KEY) {
    headers['X-Api-Key'] = API_SECRET_KEY
  }
  return headers
}

export interface AgentData {
  agentId: string
  name?: string
  description?: string
  endpoint?: string
  owner?: string
  imageUrl?: string
  healthScore: number
  uptime: number
  avgResponseTime: number
  reputation: number
  feedbackCount: number
  lastCheck: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  totalChecks: number
  successfulChecks: number
  failedChecks: number
}

export interface LeaderboardEntry {
  rank: number
  agentId: string
  name?: string
  healthScore: number
  uptime: number
  reputation: number
  feedbackCount: number
  totalChecks: number
}

export interface TrustReport {
  agentId: string
  name?: string
  description?: string
  endpoint?: string
  imageUrl?: string
  healthScore: number
  uptime: number // uptimePercent from backend
  reputation: number // reputationMean from backend
  avgResponseTime: number // avgResponseTimeMs from backend
  totalChecks: number
  successfulChecks: number
  consecutiveFailures: number
  isMonitored: boolean
  stakedAmount: string
  trustLevel: string
  lastDecision: string | null
  lastReason: string | null
  lastCheck?: string // lastChecked from backend
  narrative: {
    summary: string
    strengths: string[]
    concerns: string[]
    recommendation: string
    riskLevel: string
  }
  trends: {
    avgResponseTime: number
    stdDeviation: number
    recentTrend: string
  }
  // Extra fields for component compatibility
  recentHealth: { timestamp: number; score: number; decision: string }[]
}

export interface HealthEvent {
  timestamp: number
  score: number
  decision: string
  responseTime?: number
}

export interface OnboardingResult {
  success: boolean
  identityTxHash?: string
  agentId?: string
  ipfsHash?: string
  error?: string
}

/**
 * Fetch all monitored agents from backend DB
 */
export async function fetchAgents(): Promise<AgentData[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/agents`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('Failed to fetch agents from backend:', err)
    return []
  }
}

/**
 * Fetch leaderboard from backend DB
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/leaderboard`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('Failed to fetch leaderboard from backend:', err)
    return []
  }
}

/**
 * Fetch trust report for an agent from backend
 * Includes on-chain data, LLM narrative, and trend analysis
 */
export async function fetchTrustReport(agentId: string): Promise<TrustReport> {
  const res = await fetch(`${API_BASE_URL}/trust/${agentId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  return {
    agentId: data.agentId,
    name: data.name,
    description: data.description,
    endpoint: data.endpoint,
    imageUrl: data.imageUrl || undefined,
    healthScore: data.healthScore,
    uptime: data.uptimePercent ?? 0,
    reputation: data.reputationMean ?? 0,
    avgResponseTime: data.avgResponseTimeMs ?? 0,
    totalChecks: data.totalChecks ?? 0,
    successfulChecks: data.successfulChecks ?? 0,
    consecutiveFailures: data.consecutiveFailures ?? 0,
    isMonitored: data.isMonitored ?? false,
    stakedAmount: data.stakedAmount ?? '0',
    trustLevel: data.trustLevel ?? 'unknown',
    lastDecision: data.lastDecision ?? null,
    lastReason: data.lastReason ?? null,
    lastCheck: data.lastChecked ?? new Date().toISOString(),
    narrative: data.narrative ?? {
      summary: 'No narrative available',
      strengths: [],
      concerns: [],
      recommendation: 'Monitor agent performance',
      riskLevel: 'unknown',
    },
    trends: data.trends ?? {
      avgResponseTime: 0,
      stdDeviation: 0,
      recentTrend: 'stable',
    },
    // Map healthHistory from backend to recentHealth format
    recentHealth: (data.healthHistory || []).map((h: any) => ({
      timestamp: new Date(h.timestamp).getTime(),
      score: h.healthScore,
      decision: h.decision,
    })),
  }
}

/**
 * Fetch agent health event history from backend DB
 */
export async function fetchAgentHistory(agentId: string): Promise<HealthEvent[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/agents/${agentId}/history`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return (data.history || []).map((e: any) => ({
      timestamp: new Date(e.timestamp).getTime(),
      score: e.healthScore,
      decision: e.decision,
      responseTime: e.responseTimeMs,
    }))
  } catch (err) {
    console.error('Failed to fetch agent history from backend:', err)
    return []
  }
}


// Helper to format time ago
export function formatTimeAgo(timestamp: number | string): string {
  const now = Date.now()
  const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
  const diff = now - ts

  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// Helper to get status from health score
export function getStatusFromScore(score: number): 'healthy' | 'degraded' | 'unhealthy' {
  if (score >= 80) return 'healthy'
  if (score >= 50) return 'degraded'
  return 'unhealthy'
}

// ─── Agent Registration API ──────────────────────────────────────────

export interface PrepareOnboardResult {
  uri: string
  validation: {
    isValid: boolean
    readinessScore: number
    suggestions?: string[]
    duplicateRisk?: string
  }
  metadata: Record<string, any>
  message: string
}

/**
 * Prepare onboarding — validate + upload agent card to IPFS
 * This is a POST endpoint that requires API key auth
 */
export async function prepareOnboard(params: {
  name: string
  description: string
  endpoint: string
  capabilities?: string[]
  image?: string
}): Promise<PrepareOnboardResult> {
  const res = await fetch(`${API_BASE_URL}/prepareOnboard`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(errData.error || errData.message || 'Failed to prepare onboarding')
  }
  return res.json()
}

/**
 * Notify backend about a newly registered agent so it appears in directory immediately.
 */
export async function notifyAgentRegistered(params: {
  txHash: string
  name: string
  description: string
  endpoint: string
  owner: string
  image?: string
  stakeAmount?: string
}): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/agents/notify`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    })
  } catch (err) {
    // Non-critical — the agent will pick it up eventually
    console.warn('Failed to notify backend about new agent:', err)
  }
}

/**
 * Notify backend about an unregistered agent so it's removed from directory immediately.
 */
export async function notifyAgentUnregistered(agentId: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/agents/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    })
  } catch (err) {
    console.warn('Failed to notify backend about unregistered agent:', err)
  }
}

/**
 * Request test ORACLE tokens from the backend faucet (for testing only).
 * Will be depreciated soon
 */
export async function requestFaucet(recipient: string, amount = 15): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/faucet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, amount }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return { success: true, txHash: data.txHash }
  } catch (err: any) {
    return { success: false, error: err.message || 'Faucet request failed' }
  }
}
