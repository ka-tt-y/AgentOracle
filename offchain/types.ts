// Shared type definitions for Oracle Agent

export interface MonitoredAgent {
  agentId: bigint;
  endpoint: string;
}

export interface PingResult {
  success: boolean;
  responseTimeMs: number;
  data: any;
}

export interface SubgraphAgent {
  agentId: string;
  endpoint: string;
  healthScore: number;
  consecutiveFailures: number;
  successfulChecks: number;
  totalChecks: number;
  totalSlashed: string;
  suspiciousCount: number;
  lastCheckTimestamp: string;
  stakedAmount: string;
  isActive: boolean;
}

export interface HealthHistoryEntry {
  timestamp: string;
  healthScore: number;
  decision: string;
  reason?: string;
}

export interface TrustResponse {
  agentId: string;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  healthScore: number;
  uptimePercent: number;
  avgResponseTimeMs: number;
  totalChecks: number;
  successfulChecks: number;
  consecutiveFailures: number;
  isMonitored: boolean;
  endpoint: string;
  stakedAmount: string;
  totalSlashed: string;
  suspiciousCount: number;
  reputationMean: number;
  reputationCount: number;
  trustLevel: string;
  lastDecision: string | null;
  lastReason: string | null;
  lastChecked: string | null;
  narrative: {
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
    riskLevel: string;
  };
  trends: {
    avgResponseTime: number;
    stdDeviation: number;
    recentTrend: string;
  };
  healthHistory: HealthHistoryEntry[];
}

export interface AgentListItem {
  agentId: string;
  name: string | null;
  description: string | null;
  endpoint: string | null;
  owner: string | null;
  imageUrl: string | null;
  healthScore: number;
  uptime: number;
  avgResponseTime: number;
  reputation: number;
  feedbackCount: number;
  lastCheck: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
}

export interface LeaderboardItem {
  rank: number;
  agentId: string;
  name: string | null;
  healthScore: number;
  uptime: number;
  reputation: number;
  feedbackCount: number;
  totalChecks: number;
}
