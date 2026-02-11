// Agent decision functions using native Groq SDK with structured outputs
import Groq from 'groq-sdk';
import axios from 'axios';
import { formatEther } from 'viem';
import * as db from '../db/mongo.js';

export interface HealthDecision {
    decision: 'healthy' | 'suspicious' | 'critical';
    reason: string;
    slashPercent?: number | null;
    failureType?: 'none' | 'timeout' | 'error' | 'spoofed' | 'degraded' | 'unknown' | null;
    anomalyDetected?: boolean | null;
    anomalyDetails?: string | null;
}

export interface ResponseValidation {
    isValid: boolean;
    schemaCompliant: boolean;
    isSpoofed: boolean;
    issues: string[];
    confidence: number;
}

export interface TrustNarrative {
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendation: 'trust' | 'verify' | 'caution' | 'avoid';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface OnboardingValidation {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
    generatedDescription?: string | null;
    duplicateRisk: 'none' | 'low' | 'medium' | 'high';
    readinessScore: number;
}

// ─── JSON Schemas for Groq Structured Outputs ────────────────────────
// Following Groq's requirements: all fields required, use ["type", "null"] for optional

const HealthDecisionJSONSchema = {
    name: 'health_decision',
    strict: false,
    schema: {
        type: 'object',
        properties: {
            decision: { type: 'string', enum: ['healthy', 'suspicious', 'critical'] },
            reason: { type: 'string' },
            slashPercent: { type: ['number', 'null'] },
            failureType: {
                type: ['string', 'null'],
                enum: ['none', 'timeout', 'error', 'spoofed', 'degraded', 'unknown', null]
            },
            anomalyDetected: { type: ['boolean', 'null'] },
            anomalyDetails: { type: ['string', 'null'] },
        },
        required: ['decision', 'reason', 'slashPercent', 'failureType', 'anomalyDetected', 'anomalyDetails'],
        additionalProperties: false,
    },
};

const ResponseValidationJSONSchema = {
    name: 'response_validation',
    strict: false,
    schema: {
        type: 'object',
        properties: {
            isValid: { type: 'boolean' },
            schemaCompliant: { type: 'boolean' },
            isSpoofed: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' },
        },
        required: ['isValid', 'schemaCompliant', 'isSpoofed', 'issues', 'confidence'],
        additionalProperties: false,
    },
};

const TrustNarrativeJSONSchema = {
    name: 'trust_narrative',
    strict: false,
    schema: {
        type: 'object',
        properties: {
            summary: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            concerns: { type: 'array', items: { type: 'string' } },
            recommendation: { type: 'string', enum: ['trust', 'verify', 'caution', 'avoid'] },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        },
        required: ['summary', 'strengths', 'concerns', 'recommendation', 'riskLevel'],
        additionalProperties: false,
    },
};

const OnboardingValidationJSONSchema = {
    name: 'onboarding_validation',
    strict: false,
    schema: {
        type: 'object',
        properties: {
            isValid: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } },
            suggestions: { type: 'array', items: { type: 'string' } },
            generatedDescription: { type: ['string', 'null'] },
            duplicateRisk: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
            readinessScore: { type: 'number' },
        },
        required: ['isValid', 'issues', 'suggestions', 'generatedDescription', 'duplicateRisk', 'readinessScore'],
        additionalProperties: false,
    },
};

// ─── Static System Prompts (for caching) ─────────────────────────────
// These are placed FIRST in all requests to maximize cache hits

const SYSTEM_PROMPTS = {
    healthMonitor: `You are the autonomous health oracle for AgentOracle, a decentralized trust layer for AI agents on Monad. Your job is to analyze agent health telemetry and produce a reasoned diagnostic.

For each check, you receive: ping result (success/fail + latency), historical health score, uptime %, consecutive failure count, total checks, response time trends (avg, σ, recent direction), and optional validation data.

IMPORTANT GUIDELINES:
- Be LENIENT with new agents (totalChecks < 10). They are still building history. If responding, default to "healthy".
- A single failure is NOT critical. Only mark "suspicious" after 3+ consecutive failures.
- High response times alone are not concerning if the agent is responding successfully.
- Only mark "critical" for clear evidence of malicious behavior, spoofing, or extended downtime (5+ failures).

Decision rules:
- "healthy": Agent is up and responding. This is the DEFAULT for any successful response.
- "suspicious": Genuine concerns — 6+ consecutive failures, clear spoofing signals, or consistent degradation pattern. Explain specifically.
- "critical": ONLY for severe cases — agent completely down (5+ failures), proven data fabrication, or malicious behavior. Recommend slashPercent (10-15 for downtime, 25-45 only for proven spoofing/malicious).

Use "anomalyDetails" only for REAL anomalies you detect with evidence. Latency variance is normal. Minor issues are not anomalies. If nothing concerning, set to null.

Failure types: "none" (all good), "timeout" (slow/no response), "error" (HTTP error or crash), "spoofed" (fabricated data), "degraded" (working but declining), "unknown" (can't determine).

Write a balanced, fair assessment. Err on the side of leniency — false positives damage agent reputation unfairly.`,

    responseValidator: `You validate AI agent health endpoint responses for the AgentOracle platform. Your goal is to determine whether a response is genuine and well-formed.

A VALID health response:
- Returns JSON with a status indicator (status: "ok", "healthy", "up", etc.)
- May include: uptime, version, timestamp, agent name
- Simple responses like {"status":"ok"} or {"status":"ok","uptime":123} are COMPLETELY VALID

Spoofing requires STRONG evidence:
- Clearly fabricated data (e.g., impossibly long uptimes like 999999999 years)
- Copy-pasted generic responses with no agent-specific data
- Static timestamps that never change across multiple checks (you only see one check, so you cannot determine this)

IMPORTANT:
- Simple, minimal health responses can be normal — not always suspicious.
- Real uptime values (even round numbers) are NOT spoofing
- You only see ONE response, so you CANNOT claim it "doesn't change between checks"
- When in doubt, set isSpoofed: false

Confidence 0-100. Only flag isSpoofed: true with CLEAR evidence of fabrication.`,

    trustAnalyst: `You are the trust analyst for AgentOracle, writing assessments that other agents and humans read before deciding to interact with an agent.

You receive: health score (0-100), uptime %, response time stats, reputation score, stake amount, recent trend direction, and last health decision.

Produce a narrative assessment:
- summary: A clear 2-3 sentence overview of this agent's trustworthiness
- strengths: What this agent does well (high uptime, fast responses, consistent behavior, good reputation)
- concerns: What might worry someone (recent failures, high latency, low reputation, declining trend)
- recommendation: "trust" (excellent track record), "verify" (mostly good, worth checking), "caution" (notable issues), "avoid" (high risk)
- riskLevel: "low", "medium", "high", or "critical"

Be thoughtful and specific. Reference actual metrics. Your assessment is public and permanent.`,

    onboardingValidator: `You validate new AI agent registrations for the AgentOracle platform. Evaluate the agent's name, description, endpoint, and capabilities.

Check:
- Name: Is it appropriate, descriptive, not misleading or offensive?
- Description: Does it clearly explain what the agent does? If weak/vague, generate an improved description.
- Endpoint: Check if the format looks valid. For localhost endpoints, assume they will be accessible during testing.
- Duplicate risk: Could this be a re-registration of an existing agent?
- Readiness score 0-100: How ready is this agent for production monitoring?

Provide actionable suggestions for improvement.`,
};

// ─── Groq Client ─────────────────────────────────────────────────────
let groqInstance: Groq | null = null;

function getGroq(): Groq {
    if (!groqInstance) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY not set');
        groqInstance = new Groq({ apiKey });
    }
    return groqInstance;
}

// ─── Agent Call with Structured Output ─────────────────────────────────
async function callGroqStructured<T>(
    systemPrompt: string,
    userContent: string,
    jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> },
    maxRetries = 3
): Promise<{ result: T; cachedTokens: number }> {
    const groq = getGroq();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await groq.chat.completions.create({
                model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
                temperature: 0.2,
                max_tokens: 2048,
                messages: [
                    // Static content FIRST (for caching)
                    { role: 'system', content: systemPrompt },
                    // Dynamic content LAST
                    { role: 'user', content: userContent },
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: jsonSchema as any,
                },
            });

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error('Empty response from Groq');

            const result = JSON.parse(content) as T;
            const cachedTokens = (response.usage as any)?.prompt_tokens_details?.cached_tokens ?? 0;

            if (cachedTokens > 0) {
                console.log(`Cache hit: ${cachedTokens} tokens cached (${((cachedTokens / (response.usage?.prompt_tokens || 1)) * 100).toFixed(1)}%)`);
            }

            return { result, cachedTokens };
        } catch (err) {
            console.warn(`Groq attempt ${attempt} failed:`, (err as Error).message);
            if (attempt === maxRetries) throw err;
            await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
    }
    throw new Error('Groq max retries exceeded');
}

// ─── Response Content Validation ─────────────────────────────────────
export async function validateResponseContent(
    endpoint: string,
    responseData: any,
    agentCard: any
): Promise<ResponseValidation> {
    const cacheKey = `response:${endpoint}:${JSON.stringify(responseData)}`;
    const cached = await db.getCachedAgent<ResponseValidation>(cacheKey);
    if (cached) return cached;

    // Dynamic content (placed AFTER system prompt for caching)
    const userContent = `Endpoint: ${endpoint}
Response: ${JSON.stringify(responseData)}
Agent type: ${agentCard?.name || 'unknown'}
Check validity, schema compliance, and spoofing risk. Confidence 0-100.`;

    try {
        const { result } = await callGroqStructured<ResponseValidation>(
            SYSTEM_PROMPTS.responseValidator,
            userContent,
            ResponseValidationJSONSchema
        );
        await db.setCachedAgent(cacheKey, result);
        return result;
    } catch (err) {
        console.warn('Response validation failed:', (err as Error).message);
        return { isValid: true, schemaCompliant: true, isSpoofed: false, issues: [], confidence: 50 };
    }
}

// ─── Trust Narrative Generation ──────────────────────────────────────
export async function generateTrustNarrative(
    agentId: string,
    healthData: any,
    reputationData: { mean: number; count: number },
    cached: any
): Promise<TrustNarrative> {
    const cacheKey = `narrative:${agentId}`;
    const cachedNarrative = await db.getCachedAgent<TrustNarrative>(cacheKey);
    if (cachedNarrative) return cachedNarrative;

    const trends = await db.getResponseTrends(agentId);
    const uptimePercent = Number(healthData.totalChecks) > 0
        ? (Number(healthData.successfulChecks) * 100) / Number(healthData.totalChecks)
        : 100;

    // Dynamic content
    const userContent = `## Trust Assessment Request

**Agent:** ${agentId}
**Health Score:** ${healthData.healthScore}/100
**Uptime:** ${uptimePercent.toFixed(1)}%
**Consecutive Failures:** ${healthData.consecutiveFailures}
**Total Checks:** ${healthData.totalChecks}
**Monitored:** ${healthData.isMonitored}
**Staked Amount:** ${healthData.stakedAmount ? formatEther(BigInt(healthData.stakedAmount)) : '0'} ORCL

**Reputation Score:** ${reputationData.mean.toFixed(1)} (from ${reputationData.count} health check feedback${reputationData.count !== 1 ? 's' : ''})

**Response Time Trends:**
- Average: ${trends.avgTime.toFixed(0)}ms
- Std Deviation: ${trends.stdDev.toFixed(0)}ms
- Recent Trend: ${trends.recentTrend}

**Last Health Decision:** ${cached?.lastDecision || 'N/A'} — ${cached?.lastReason || 'No previous assessment'}

Write a thorough trust assessment for this agent.`;

    try {
        const { result } = await callGroqStructured<TrustNarrative>(
            SYSTEM_PROMPTS.trustAnalyst,
            userContent,
            TrustNarrativeJSONSchema
        );
        await db.setCachedAgent(cacheKey, result);
        return result;
    } catch (err) {
        console.warn('Trust narrative generation failed:', (err as Error).message);
        return {
            summary: 'Unable to generate trust narrative at this time.',
            strengths: [],
            concerns: ['Analysis unavailable'],
            recommendation: 'verify',
            riskLevel: 'medium',
        };
    }
}

// ─── Onboarding Validation ───────────────────────────────────────────
export async function validateOnboardingData(
    name: string,
    description: string,
    endpoint: string,
    capabilities?: string[]
): Promise<OnboardingValidation> {
    const cacheKey = `onboard:${name}:${endpoint}`;
    const cached = await db.getCachedAgent<OnboardingValidation>(cacheKey);
    if (cached) return cached;

    // Check endpoint accessibility
    let endpointAccessible = false;
    let endpointResponse: any = null;
    try {
        const res = await axios.get(endpoint, { timeout: 10000 });
        endpointAccessible = res.status >= 200 && res.status < 300;
        endpointResponse = res.data;
    } catch { /* endpoint not accessible */ }

    const userContent = `Name: "${name}" | Desc: "${description}" | Endpoint: ${endpoint} | Accessible: ${endpointAccessible}
${endpointResponse ? `Response: ${JSON.stringify(endpointResponse)}` : 'Endpoint not accessible'}
Capabilities: ${capabilities?.length ? capabilities.join(', ') : 'none'}
Evaluate and score readiness 0-100. If description is weak, generate improved one.`;

    try {
        const { result } = await callGroqStructured<OnboardingValidation>(
            SYSTEM_PROMPTS.onboardingValidator,
            userContent,
            OnboardingValidationJSONSchema
        );
        await db.setCachedAgent(cacheKey, result);
        return result;
    } catch (err) {
        console.warn('Onboarding validation failed:', (err as Error).message);
        return {
            isValid: true,
            issues: [],
            suggestions: [],
            duplicateRisk: 'none',
            readinessScore: 50,
        };
    }
}

// ─── Health Decision ─────────────────────────────────────────────────
export async function makeHealthDecision(
    agentId: string,
    endpoint: string,
    pingResult: { success: boolean; responseTimeMs: number; data: any },
    healthData: any,
    trends: { avgTime: number; stdDev: number; recentTrend: string },
    validationResult?: ResponseValidation,
    agentCard?: any
): Promise<HealthDecision> {
    const cacheKey = `health:${agentId}:${pingResult.success}:${pingResult.responseTimeMs}`;
    const cached = await db.getCachedAgent<HealthDecision>(cacheKey);
    if (cached) return cached;

    const uptimePercent = Number(healthData.totalChecks) > 0
        ? (Number(healthData.successfulChecks) * 100) / Number(healthData.totalChecks)
        : 100;

    const isAnomaly = trends.avgTime > 0 && pingResult.responseTimeMs > trends.avgTime + (2 * trends.stdDev);

    const userContent = `## Agent Health Check Report

**Agent:** ${agentId}
**Endpoint:** ${endpoint}
**Agent Type:** ${agentCard?.name || 'Unknown'}

### Current Ping
- Result: ${pingResult.success ? 'SUCCESS' : 'FAILURE'}
- Response Time: ${pingResult.responseTimeMs}ms
- Response Data: ${pingResult.data ? JSON.stringify(pingResult.data) : 'No data'}

### Historical State
- Health Score: ${healthData.healthScore}/100
- Uptime: ${uptimePercent.toFixed(1)}%
- Consecutive Failures: ${healthData.consecutiveFailures}
- Total Checks: ${healthData.totalChecks}
- Successful Checks: ${healthData.successfulChecks}

### Response Time Trends
- Average: ${trends.avgTime.toFixed(0)}ms
- Std Deviation: ${trends.stdDev.toFixed(0)}ms
- Recent Trend: ${trends.recentTrend}
- Anomaly Flag: ${isAnomaly ? 'YES — current response time exceeds avg + 2σ' : 'No'}

### Validation
${validationResult ? `- Valid: ${validationResult.isValid}\n- Spoofed: ${validationResult.isSpoofed}\n- Confidence: ${validationResult.confidence}%\n- Issues: ${validationResult.issues.length > 0 ? validationResult.issues.join('; ') : 'None'}` : 'Skipped — no validation data available'}

NOTE: The validation data above is from an automated check and may contain false positives. Use your own judgment based on the actual response data. A simple {"status":"ok"} response is valid, not spoofed.

Analyze this data and provide your health decision with full reasoning.`;

    try {
        const { result } = await callGroqStructured<HealthDecision>(
            SYSTEM_PROMPTS.healthMonitor,
            userContent,
            HealthDecisionJSONSchema
        );
        await db.setCachedAgent(cacheKey, result);
        return result;
    } catch (err) {
        console.warn('Health decision failed:', (err as Error).message);
        return {
            decision: pingResult.success ? 'healthy' : 'suspicious',
            reason: pingResult.success ? 'Endpoint responded successfully' : 'Endpoint failed to respond',
            failureType: pingResult.success ? 'none' : 'error',
            anomalyDetected: false,
            anomalyDetails: null,
        };
    }
}

export { SYSTEM_PROMPTS, getGroq };
