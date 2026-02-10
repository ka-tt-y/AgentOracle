import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AgentOracle = buildModule("AgentOracle", (m) => {
  // Deploy OracleToken first
  const oracleToken = m.contract("OracleToken", []);

  // Deploy IdentityRegistry
  const identityRegistry = m.contract("IdentityRegistry", []);

  // Deploy ReputationRegistry with IdentityRegistry address
  const reputationRegistry = m.contract("ReputationRegistry", [identityRegistry]);


  // Deploy HealthMonitor with all dependencies
  const healthMonitor = m.contract("HealthMonitor", [
    identityRegistry,
    reputationRegistry,
    oracleToken,
    m.getAccount(0), // deployer as initial updater
  ]);

  // ─── Post-deploy permission grants ───────────────────────────────

  // Allow HealthMonitor to register agents on behalf of users (for onboardAgent)
  m.call(identityRegistry, "addRegistrar", [healthMonitor], { id: "addRegistrar_HealthMonitor" });

  // Whitelist HealthMonitor as an automated system in ReputationRegistry
  m.call(reputationRegistry, "addAutomatedSystem", [healthMonitor], { id: "addAutomatedSystem_HealthMonitor" });

  return {
    oracleToken,
    identityRegistry,
    reputationRegistry,
    healthMonitor,
  };
});

export default AgentOracle;
