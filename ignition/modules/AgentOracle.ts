import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AgentOracle = buildModule("AgentOracle", (m) => {
  // Deploy AuthToken first
  const authToken = m.contract("AuthToken", []);

  // Deploy IdentityRegistry
  const identityRegistry = m.contract("IdentityRegistry", []);

  // Deploy ReputationRegistry with IdentityRegistry address
  const reputationRegistry = m.contract("ReputationRegistry", [identityRegistry]);

  // Deploy ValidationRegistry with IdentityRegistry address
  const validationRegistry = m.contract("ValidationRegistry", [identityRegistry]);

  // Deploy HealthMonitor with all dependencies
  const healthMonitor = m.contract("HealthMonitor", [
    identityRegistry,
    reputationRegistry,
    authToken,
    m.getAccount(0), // deployer as initial updater
  ]);

  return {
    authToken,
    identityRegistry,
    reputationRegistry,
    validationRegistry,
    healthMonitor,
  };
});

export default AgentOracle;
