# 🤖 Oracle Agent — AI Trust Infrastructure on Monad

> **Build trust between AI agents with verifiable identities, health monitoring, and reputation scores.**

---

## What is Oracle Agent?

Imagine a world where AI agents need to hire other AI agents. How do you know if that trading bot is trustworthy? How do you verify that data analysis agent is actually online and performing well?

**Oracle Agent** solves this by creating a decentralized trust layer for AI agents:

1. **Identity** — Agents get a verifiable on-chain identity (NFT)
2. **Health Monitoring** — 24/7 automated health checks with AI-powered analysis
3. **Reputation** — Build reputation through peer feedback
4. **Trust Scores** — Query any agent's trustworthiness before interacting

Think of it as a **"credit score + health monitor"** for AI agents.

---

### The Flow

1. **Agent Registers** → Stakes ORACLE tokens, gets an ERC-721 identity NFT, metadata stored on IPFS
2. **Monitoring Begins** → Oracle Agent pings the agent's health endpoint every 10 minutes
3. **AI Analyzes** → The agent evaluates responses, detects anomalies, makes decisions
4. **On-Chain Updates** → Health scores written to blockchain
5. **Trust Queries** → Other agents can query trustworthiness before hiring

---

## 🎯 Key Features

### ✅ Verifiable Identity (ERC-8004)
- Every agent gets an NFT representing their identity
- Agent Card metadata stored on IPFS (name, capabilities, endpoints)
- Composable with other ERC-8004 services

### 📡 24/7 Health Monitoring
- Automated endpoint pinging
- Response time tracking
- Anomaly detection via AI
- Consecutive failure tracking
- Uptime percentage calculations

### 🧠 AI-Powered Decisions
- Groq analyzes health responses
- Detects spoofed or fake health endpoints
- Generates human-readable trust narratives
- Validates onboarding data quality

### 💰 Token Economics (ORACLE)
- Stake tokens to enable monitoring
- Earn reputation through good behavior
- Get slashed for downtime or malicious behavior
- Pay for premium monitoring features (Coming soon)

### 📊 MongoDB Persistence
- Historical health data storage
- AI response caching with TTL
- Response trend analysis
- Leaderboard tracking

### TheGraph integration
- Indexes all on-chain events (agent registrations, health updates, stake changes)
- Enables complex queries like "top 10 agents by uptime" or "all agents owned by address X"
- Subgraph schema tracks AgentRegistered, HealthUpdated, and ReputationChanged events

---

## 🌐 API Endpoints

The Oracle Agent exposes a REST API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Agent's own health status |
| `/trust/:agentId` | GET | Full trust report for an agent |
| `/agents` | GET | List all monitored agents |
| `/agents/:agentId/history` | GET | Historical health events |
| `/leaderboard` | GET | Top agents by health score |


### Example: Query Trust

```bash
curl http://localhost:4000/trust/1
```

Response:
```json
{
  "agentId": "1",
  "healthScore": 95,
  "uptimePercent": 99.8,
  "trustLevel": "High",
  "narrative": {
    "summary": "This agent demonstrates excellent reliability...",
    "strengths": ["99.8% uptime", "Fast response times"],
    "concerns": [],
    "recommendation": "trust",
    "riskLevel": "low"
  }
}
```

---

## 🔧 Smart Contracts

### IdentityRegistry
- `register(metadataURI)` — Register new agent, mint identity NFT
- `tokenURI(agentId)` — Get IPFS metadata URI
- `ownerOf(agentId)` — Get owner address

### HealthMonitor
- `registerAgent(agentId, endpoint)` — Enable monitoring
- `submitHealthCheck(agentId, success, responseTime)` — Record check
- `getHealthData(agentId)` — Get health stats
- `slashAgent(agentId, percent)` — Penalize bad actors

### OracleToken (ORACLE)
- Standard ERC-20 with 18 decimals
- Initial supply: 1 million ORACLE
- Used for staking and fees

---

## 🔮 Roadmap

- [x] Core contracts (Identity, Health, Reputation)
- [x] Off-chain monitoring agent
- [x] AI-powered decisions
- [x] MongoDB persistence
- [x] React dashboard
- [ ] TEE/ZK attestations
- [ ] Multi-chain support
- [ ] Agent-to-agent payments
- [ ] Premium monitoring tiers

---

## 🛠️ Development

### Run Tests

```bash
npx hardhat test
```

### Deploy to Testnet

```bash
npx hardhat ignition deploy ignition/modules/AgentOracle.ts --network monad
```

### Build Frontend

```bash
cd frontend
npm run build
```

---

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

## 📄 License

MIT

---

## 🔗 Links

- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [Monad Network](https://monad.xyz)
- [Hardhat](https://hardhat.org)
