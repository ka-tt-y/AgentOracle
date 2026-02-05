import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
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
} from "../generated/HealthMonitor/HealthMonitor"

export function createHealthUpdatedEvent(
  agentId: BigInt,
  oldScore: i32,
  newScore: i32,
  responseTime: BigInt,
  success: boolean
): HealthUpdated {
  let healthUpdatedEvent = changetype<HealthUpdated>(newMockEvent())

  healthUpdatedEvent.parameters = new Array()

  healthUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "agentId",
      ethereum.Value.fromUnsignedBigInt(agentId)
    )
  )
  healthUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "oldScore",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(oldScore))
    )
  )
  healthUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newScore",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(newScore))
    )
  )
  healthUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "responseTime",
      ethereum.Value.fromUnsignedBigInt(responseTime)
    )
  )
  healthUpdatedEvent.parameters.push(
    new ethereum.EventParam("success", ethereum.Value.fromBoolean(success))
  )

  return healthUpdatedEvent
}

export function createMonitoringDisabledEvent(
  agentId: BigInt,
  returnedAmount: BigInt
): MonitoringDisabled {
  let monitoringDisabledEvent = changetype<MonitoringDisabled>(newMockEvent())

  monitoringDisabledEvent.parameters = new Array()

  monitoringDisabledEvent.parameters.push(
    new ethereum.EventParam(
      "agentId",
      ethereum.Value.fromUnsignedBigInt(agentId)
    )
  )
  monitoringDisabledEvent.parameters.push(
    new ethereum.EventParam(
      "returnedAmount",
      ethereum.Value.fromUnsignedBigInt(returnedAmount)
    )
  )

  return monitoringDisabledEvent
}

export function createMonitoringEnabledEvent(
  agentId: BigInt,
  endpoint: string,
  stakedAmount: BigInt
): MonitoringEnabled {
  let monitoringEnabledEvent = changetype<MonitoringEnabled>(newMockEvent())

  monitoringEnabledEvent.parameters = new Array()

  monitoringEnabledEvent.parameters.push(
    new ethereum.EventParam(
      "agentId",
      ethereum.Value.fromUnsignedBigInt(agentId)
    )
  )
  monitoringEnabledEvent.parameters.push(
    new ethereum.EventParam("endpoint", ethereum.Value.fromString(endpoint))
  )
  monitoringEnabledEvent.parameters.push(
    new ethereum.EventParam(
      "stakedAmount",
      ethereum.Value.fromUnsignedBigInt(stakedAmount)
    )
  )

  return monitoringEnabledEvent
}

export function createRoleAdminChangedEvent(
  role: Bytes,
  previousAdminRole: Bytes,
  newAdminRole: Bytes
): RoleAdminChanged {
  let roleAdminChangedEvent = changetype<RoleAdminChanged>(newMockEvent())

  roleAdminChangedEvent.parameters = new Array()

  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "previousAdminRole",
      ethereum.Value.fromFixedBytes(previousAdminRole)
    )
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newAdminRole",
      ethereum.Value.fromFixedBytes(newAdminRole)
    )
  )

  return roleAdminChangedEvent
}

export function createRoleGrantedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())

  roleGrantedEvent.parameters = new Array()

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleGrantedEvent
}

export function createRoleRevokedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent())

  roleRevokedEvent.parameters = new Array()

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleRevokedEvent
}

export function createSlashedEvent(
  agentId: BigInt,
  amount: BigInt,
  reason: string
): Slashed {
  let slashedEvent = changetype<Slashed>(newMockEvent())

  slashedEvent.parameters = new Array()

  slashedEvent.parameters.push(
    new ethereum.EventParam(
      "agentId",
      ethereum.Value.fromUnsignedBigInt(agentId)
    )
  )
  slashedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  slashedEvent.parameters.push(
    new ethereum.EventParam("reason", ethereum.Value.fromString(reason))
  )

  return slashedEvent
}

export function createStakeAddedEvent(
  agentId: BigInt,
  amount: BigInt
): StakeAdded {
  let stakeAddedEvent = changetype<StakeAdded>(newMockEvent())

  stakeAddedEvent.parameters = new Array()

  stakeAddedEvent.parameters.push(
    new ethereum.EventParam(
      "agentId",
      ethereum.Value.fromUnsignedBigInt(agentId)
    )
  )
  stakeAddedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return stakeAddedEvent
}

export function createSuspiciousReportedEvent(
  agentId: BigInt,
  reason: string
): SuspiciousReported {
  let suspiciousReportedEvent = changetype<SuspiciousReported>(newMockEvent())

  suspiciousReportedEvent.parameters = new Array()

  suspiciousReportedEvent.parameters.push(
    new ethereum.EventParam(
      "agentId",
      ethereum.Value.fromUnsignedBigInt(agentId)
    )
  )
  suspiciousReportedEvent.parameters.push(
    new ethereum.EventParam("reason", ethereum.Value.fromString(reason))
  )

  return suspiciousReportedEvent
}
