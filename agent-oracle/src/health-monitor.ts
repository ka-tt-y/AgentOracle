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
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  Slashed,
  StakeAdded,
  SuspiciousReported
} from "../generated/schema"

export function handleHealthUpdated(event: HealthUpdatedEvent): void {
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
}
