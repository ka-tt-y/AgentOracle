import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import { HealthUpdated } from "../generated/schema"
import { HealthUpdated as HealthUpdatedEvent } from "../generated/HealthMonitor/HealthMonitor"
import { handleHealthUpdated } from "../src/health-monitor"
import { createHealthUpdatedEvent } from "./health-monitor-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let agentId = BigInt.fromI32(234)
    let oldScore = 123
    let newScore = 123
    let responseTime = BigInt.fromI32(234)
    let success = "boolean Not implemented"
    let newHealthUpdatedEvent = createHealthUpdatedEvent(
      agentId,
      oldScore,
      newScore,
      responseTime,
      success
    )
    handleHealthUpdated(newHealthUpdatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("HealthUpdated created and stored", () => {
    assert.entityCount("HealthUpdated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "HealthUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "agentId",
      "234"
    )
    assert.fieldEquals(
      "HealthUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "oldScore",
      "123"
    )
    assert.fieldEquals(
      "HealthUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "newScore",
      "123"
    )
    assert.fieldEquals(
      "HealthUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "responseTime",
      "234"
    )
    assert.fieldEquals(
      "HealthUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "success",
      "boolean Not implemented"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
