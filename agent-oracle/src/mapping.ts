import {
  MonitoringEnabled as MonitoringEnabledEvent,
  MonitoringDisabled as MonitoringDisabledEvent,
  HealthUpdated as HealthUpdatedEvent,
  // ... other events you care about
} from "../generated/HealthMonitor/HealthMonitor";

import {
  MonitoringEnabled,
  MonitoringDisabled,
  HealthUpdated,
  MonitoredAgent,           // ← Now it will be exported
} from "../generated/schema";

export function handleMonitoringEnabled(event: MonitoringEnabledEvent): void {
  // Save raw event (keep your existing code)
  let eventEntity = new MonitoringEnabled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  eventEntity.agentId = event.params.agentId;
  eventEntity.endpoint = event.params.endpoint;
  eventEntity.stakedAmount = event.params.stakedAmount;
  eventEntity.blockNumber = event.block.number;
  eventEntity.blockTimestamp = event.block.timestamp;
  eventEntity.transactionHash = event.transaction.hash;
  eventEntity.save();

  // === Custom state update ===
  let agent = MonitoredAgent.load(event.params.agentId.toString());

  if (!agent) {
    agent = new MonitoredAgent(event.params.agentId.toString());
    agent.agentId = event.params.agentId;
    agent.endpoint = event.params.endpoint;
    agent.stakedAmount = event.params.stakedAmount;
    agent.createdAt = event.block.timestamp;
    agent.isActive = true;
  } else {
    // Update if re-enabled (rare but possible)
    agent.endpoint = event.params.endpoint;
    agent.stakedAmount = event.params.stakedAmount;
    agent.isActive = true;
  }

  agent.updatedAt = event.block.timestamp;
  agent.save();
}

export function handleMonitoringDisabled(event: MonitoringDisabledEvent): void {
  // Save raw event
  let eventEntity = new MonitoringDisabled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  eventEntity.agentId = event.params.agentId;
  eventEntity.returnedAmount = event.params.returnedAmount;
  // ... rest of your code
  eventEntity.save();

  // Mark as inactive in custom entity
  let agent = MonitoredAgent.load(event.params.agentId.toString());
  if (agent) {
    agent.isActive = false;
    agent.updatedAt = event.block.timestamp;
    agent.save();
  }
}

export function handleHealthUpdated(event: HealthUpdatedEvent): void {
  // Save raw event (your existing code)

  // Optional: update latest health in MonitoredAgent for quick queries
  let agent = MonitoredAgent.load(event.params.agentId.toString());
  if (agent) {
    agent.healthScore = event.params.newScore.toI32();
    agent.lastCheckTimestamp = event.block.timestamp;
    // You can also compute consecutiveFailures if you track it here
    agent.updatedAt = event.block.timestamp;
    agent.save();
  }
}

// Add handlers for Slashed, SuspiciousReported, etc., if you want to reflect them in MonitoredAgent (e.g., reduce score)