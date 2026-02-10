import {
  HealthUpdated as HealthUpdatedEvent,
  MonitoringDisabled as MonitoringDisabledEvent,
  MonitoringEnabled as MonitoringEnabledEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  Slashed as SlashedEvent,
  StakeAdded as StakeAddedEvent,
  SuspiciousReported as SuspiciousReportedEvent
} from "../generated/HealthMonitor/HealthMonitor"
import {
  HealthUpdated,
  MonitoringDisabled,
  MonitoringEnabled,
  MonitoredAgent,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  Slashed,
  StakeAdded,
  SuspiciousReported
} from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

// Helper to get or create MonitoredAgent
function getOrCreateAgent(agentId: BigInt, timestamp: BigInt): MonitoredAgent {
  let id = agentId.toString()
  let agent = MonitoredAgent.load(id)
  if (agent == null) {
    agent = new MonitoredAgent(id)
    agent.agentId = agentId
    agent.endpoint = ""
    agent.stakedAmount = BigInt.fromI32(0)
    agent.healthScore = 100
    agent.consecutiveFailures = 0
    agent.totalChecks = 0
    agent.successfulChecks = 0
    agent.totalSlashed = BigInt.fromI32(0)
    agent.suspiciousCount = 0
    agent.lastCheckTimestamp = timestamp
    agent.isActive = false
    agent.createdAt = timestamp
    agent.updatedAt = timestamp
  }
  return agent
}

export function handleHealthUpdated(event: HealthUpdatedEvent): void {
  // Store immutable event record
  let entity = new HealthUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.agentId = event.params.agentId
  entity.oldScore = event.params.oldScore
  entity.newScore = event.params.newScore
  entity.responseTime = event.params.responseTime
  entity.success = event.params.success

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // Update aggregated MonitoredAgent state
  let agent = getOrCreateAgent(event.params.agentId, event.block.timestamp)
  agent.healthScore = event.params.newScore
  agent.lastCheckTimestamp = event.block.timestamp
  agent.totalChecks = agent.totalChecks + 1
  if (event.params.success) {
    agent.successfulChecks = agent.successfulChecks + 1
    agent.consecutiveFailures = 0
  } else {
    agent.consecutiveFailures = agent.consecutiveFailures + 1
  }
  agent.updatedAt = event.block.timestamp
  agent.save()
}

export function handleMonitoringDisabled(event: MonitoringDisabledEvent): void {
  let entity = new MonitoringDisabled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.agentId = event.params.agentId
  entity.returnedAmount = event.params.returnedAmount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // Update aggregated MonitoredAgent state
  let agent = getOrCreateAgent(event.params.agentId, event.block.timestamp)
  agent.isActive = false
  agent.stakedAmount = BigInt.fromI32(0)
  agent.updatedAt = event.block.timestamp
  agent.save()
}

export function handleMonitoringEnabled(event: MonitoringEnabledEvent): void {
  let entity = new MonitoringEnabled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.agentId = event.params.agentId
  entity.endpoint = event.params.endpoint
  entity.stakedAmount = event.params.stakedAmount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // Update aggregated MonitoredAgent state
  let agent = getOrCreateAgent(event.params.agentId, event.block.timestamp)
  agent.endpoint = event.params.endpoint
  agent.stakedAmount = event.params.stakedAmount
  agent.isActive = true
  agent.healthScore = 100
  agent.consecutiveFailures = 0
  agent.updatedAt = event.block.timestamp
  agent.save()
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let entity = new RoleAdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.previousAdminRole = event.params.previousAdminRole
  entity.newAdminRole = event.params.newAdminRole

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let entity = new RoleGranted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let entity = new RoleRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSlashed(event: SlashedEvent): void {
  let entity = new Slashed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.agentId = event.params.agentId
  entity.amount = event.params.amount
  entity.reason = event.params.reason

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // Update aggregated MonitoredAgent state
  let agent = getOrCreateAgent(event.params.agentId, event.block.timestamp)
  agent.totalSlashed = agent.totalSlashed.plus(event.params.amount)
  agent.stakedAmount = agent.stakedAmount.minus(event.params.amount)
  agent.updatedAt = event.block.timestamp
  agent.save()
}

export function handleStakeAdded(event: StakeAddedEvent): void {
  let entity = new StakeAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.agentId = event.params.agentId
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // Update aggregated MonitoredAgent state
  let agent = getOrCreateAgent(event.params.agentId, event.block.timestamp)
  agent.stakedAmount = agent.stakedAmount.plus(event.params.amount)
  agent.updatedAt = event.block.timestamp
  agent.save()
}

export function handleSuspiciousReported(event: SuspiciousReportedEvent): void {
  let entity = new SuspiciousReported(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.agentId = event.params.agentId
  entity.reason = event.params.reason

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // Update aggregated MonitoredAgent state
  let agent = getOrCreateAgent(event.params.agentId, event.block.timestamp)
  agent.suspiciousCount = agent.suspiciousCount + 1
  agent.updatedAt = event.block.timestamp
  agent.save()
}
