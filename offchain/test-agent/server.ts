// Test Agent Server - Spawnable endpoint for hackathon demo
// Run: npx tsx offchain/test-agent/server.ts
// Endpoint: http://localhost:3001/health
// Toggle: ?status=healthy|unhealthy|suspicious|error

import express from 'express';

const app = express();
const PORT = Number(process.env.TEST_AGENT_PORT) || 3001;

// Mutable state for demo
let agentState = {
  status: 'healthy' as 'healthy' | 'unhealthy' | 'suspicious' | 'error',
  requestCount: 0,
  startedAt: Date.now(),
};

// ─── Demo Agent Card JSONs ───────────────────────────────────────────
const DEMO_AGENT_CARDS: Record<string, any> = {
  healthy: {
    name: 'Healthy Agent',
    description: 'Responds correctly with fast latency. Will build strong reputation.',
    services: [{ name: 'status', endpoint: `http://localhost:${PORT}/health?status=healthy` }],
    capabilities: ['health-check', 'demo-mode'],
    demo: true,
    preset: 'healthy',
  },
  unhealthy: {
    name: 'Unreliable Agent',
    description: 'Intermittently fails checks. Will get flagged and eventually slashed.',
    services: [{ name: 'status', endpoint: `http://localhost:${PORT}/health?status=unhealthy` }],
    capabilities: ['health-check', 'demo-mode'],
    demo: true,
    preset: 'unhealthy',
  },
  suspicious: {
    name: 'Suspicious Agent',
    description: 'Returns spoofed data. Will trigger critical slash from LLM detection.',
    services: [{ name: 'status', endpoint: `http://localhost:${PORT}/health?status=suspicious` }],
    capabilities: ['health-check', 'demo-mode'],
    demo: true,
    preset: 'suspicious',
  },
};

// GET /agent-card/:preset — return pre-built agent card JSON for demo presets
app.get('/agent-card/:preset', (req, res) => {
  const preset = req.params.preset;
  const card = DEMO_AGENT_CARDS[preset];
  if (!card) {
    return res.status(404).json({ error: `Unknown preset: ${preset}. Use healthy, unhealthy, or suspicious.` });
  }
  res.json(card);
});

// Health endpoint - the main endpoint that AgentOracle monitors
app.get('/health', async (req, res) => {
  agentState.requestCount++;
  
  // Allow status override via query param (for demo)
  const overrideStatus = req.query.status as string;
  const currentStatus = overrideStatus || agentState.status;
  
  // Simulate different behaviors
  switch (currentStatus) {
    case 'suspicious':
      // Simulate suspicious response (4-7 seconds)
      await new Promise(r => setTimeout(r, 4000 + Math.random() * 3000));
      return res.json({
        status: 'unsuspicious',
        message: 'Agent is running (suspicious mode)',
        uptime: Math.floor((Date.now() - agentState.startedAt) / 1000),
        requestCount: agentState.requestCount,
        mode: 'suspicious',
      });

    case 'unhealthy':
      // Return unhealthy status
      return res.status(503).json({
        status: 'unhealthy',
        message: 'Agent is experiencing issues',
        error: 'Service temporarily degraded',
      });

    case 'error':
      // Return 500 error
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: 'Something went wrong',
      });

    case 'healthy':
    default:
      // Normal healthy response
      return res.json({
        status: 'ok',
        message: 'Test agent is running',
        uptime: Math.floor((Date.now() - agentState.startedAt) / 1000),
        requestCount: agentState.requestCount,
        version: '1.0.0',
        capabilities: ['health-check', 'demo-mode'],
      });
  }
});

// Control endpoint - change agent behavior for demo
app.get('/control', (req, res) => {
  const newStatus = req.query.set as string;
  
  if (newStatus && ['healthy', 'unhealthy', 'suspicious', 'error'].includes(newStatus)) {
    agentState.status = newStatus as typeof agentState.status;
    return res.json({
      message: `Agent status set to: ${newStatus}`,
      currentState: agentState,
    });
  }
  
  res.json({
    message: 'Test Agent Control Panel',
    currentState: agentState,
    usage: {
      setHealthy: '/control?set=healthy',
      setUnhealthy: '/control?set=unhealthy',
      setSuspicious: '/control?set=suspicious',
      setError: '/control?set=error',
    },
  });
});

// Info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AgentOracle Test Agent',
    description: 'Spawnable test agent for hackathon demo. Can simulate healthy, unhealthy, suspicious, or error states.',
    endpoints: {
      health: 'GET /health - Main health check endpoint (monitored by AgentOracle)',
      control: 'GET /control?set=[status] - Change agent behavior',
    },
    currentState: agentState,
  });
});

app.listen(PORT, () => {
  console.log(`🤖 Test Agent running at http://localhost:${PORT}`);
  console.log(`   Health endpoint: http://localhost:${PORT}/health`);
  console.log(`   Control panel:   http://localhost:${PORT}/control`);
  console.log('');
  console.log('   Toggle states:');
  console.log(`   - Healthy:   curl http://localhost:${PORT}/control?set=healthy`);
  console.log(`   - Unhealthy: curl http://localhost:${PORT}/control?set=unhealthy`);
  console.log(`   - suspicious:      curl http://localhost:${PORT}/control?set=suspicious`);
  console.log(`   - Error:     curl http://localhost:${PORT}/control?set=error`);
});
