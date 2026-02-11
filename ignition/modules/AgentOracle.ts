import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NADFUN_ORACLE_TOKEN = "0x3CFea8267fa10A9ebA76Dd84A23Ac94efcA07777";

const AgentOracle = buildModule("AgentOracle", (m) => {
  // Deploy IdentityRegistry
  const identityRegistry = m.contract("IdentityRegistry", []);

  // Deploy ReputationRegistry with IdentityRegistry address
  const reputationRegistry = m.contract("ReputationRegistry", [identityRegistry]);

  // Deploy HealthMonitor with all dependencies
  const healthMonitor = m.contract("HealthMonitor", [
    identityRegistry,
    reputationRegistry,
    NADFUN_ORACLE_TOKEN,
    m.getAccount(0), // deployer as initial updater
  ]);

  // ─── Post-deploy permission grants ───────────────────────────────

  // Allow HealthMonitor to register agents on behalf of users (for onboardAgent)
  m.call(identityRegistry, "addRegistrar", [healthMonitor], { id: "addRegistrar_HealthMonitor" });

  // Whitelist HealthMonitor as an automated system in ReputationRegistry
  m.call(reputationRegistry, "addAutomatedSystem", [healthMonitor], { id: "addAutomatedSystem_HealthMonitor" });

  return {
    identityRegistry,
    reputationRegistry,
    healthMonitor,
  };
});

export default AgentOracle;
