import assert from "node:assert/strict";
import test from "node:test";
import {
  syntheticEvidenceUniverse,
  syntheticMatters,
  syntheticOperationalEventGroundTruth,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import { syntheticCurrentStateGroundTruth } from "@/data/synthetic-current-state";
import { buildEligibleEvidenceSet } from "@/lib/evidence-processing";
import { extractOperationalEvents } from "@/lib/operational-events";
import { deriveCurrentStatusSlot } from "@/lib/current-state-reasoning";

const evidenceProcessing = buildEligibleEvidenceSet({
  user: syntheticRequestingUser,
  selectedMatter: syntheticMatters[0],
  evidenceUniverse: syntheticEvidenceUniverse,
});

const extractedEvents = extractOperationalEvents({
  eligibleEvidence: evidenceProcessing.eligibleEvidence,
  groundTruth: syntheticOperationalEventGroundTruth,
  matterId: syntheticMatters[0].id,
});

test("derived current-status slot matches ground-truth expectation", () => {
  const derived = deriveCurrentStatusSlot(
    extractedEvents,
    syntheticMatters[0].id,
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "current-status",
  );

  assert.ok(expectation, "Ground truth has current-status expectation");

  assert.equal(
    derived.id,
    "current-status",
    "Derived slot has correct ID",
  );
  assert.equal(
    derived.state,
    expectation.expectedState,
    "Derived state matches ground truth",
  );
  assert.equal(
    derived.value,
    expectation.expectedValue,
    "Derived value matches ground truth",
  );

  // Map event IDs to artifact IDs for comparison
  const eventToArtifactMap = new Map(
    extractedEvents.map((event) => [
      event.eventId,
      event.provenance.sourceArtifactId,
    ]),
  );

  const expectedArtifactIds = expectation.supportingEventIds
    .map((eventId) => eventToArtifactMap.get(eventId))
    .filter((id): id is string => id !== undefined)
    .sort();
  const derivedArtifactIds = [...derived.evidenceIds].sort();

  assert.deepEqual(
    derivedArtifactIds,
    expectedArtifactIds,
    "Derived evidence artifacts match ground truth supporting events",
  );
});

test("derived slot identifies superseded waiting-state event", () => {
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "current-status",
  );

  assert.ok(expectation, "Ground truth has current-status expectation");
  assert.equal(
    expectation.supersededEventIds.length,
    1,
    "Ground truth has exactly one superseded event",
  );
  assert.equal(
    expectation.supersededEventIds[0],
    "email-0142-waiting-on-counsel:waiting-state-reported",
    "The waiting-state-reported event is superseded",
  );

  // Verify the superseding events come after the superseded event
  const supersededEvent = extractedEvents.find(
    (e) => e.eventId === expectation.supersededEventIds[0],
  );
  const supersedingEvents = extractedEvents.filter((e) =>
    expectation.supportingEventIds.includes(e.eventId),
  );

  assert.ok(supersededEvent, "Superseded event exists in extraction");
  assert.ok(
    supersedingEvents.length > 0,
    "At least one superseding event exists",
  );

  const supersededTime = new Date(
    supersededEvent.provenance.sourceRecordedAt,
  ).getTime();

  for (const superseding of supersedingEvents) {
    const supersedingTime = new Date(
      superseding.provenance.sourceRecordedAt,
    ).getTime();
    assert.ok(
      supersedingTime > supersededTime,
      `Superseding event ${superseding.eventId} recorded after superseded event`,
    );
  }
});

test("mutation: removing document-sent event breaks derivation", () => {
  // Remove the DOCUMENT_SENT event that supersedes the waiting state
  const eventsWithoutDocSent = extractedEvents.filter(
    (e) => e.eventType !== "DOCUMENT_SENT",
  );

  const derived = deriveCurrentStatusSlot(
    eventsWithoutDocSent,
    syntheticMatters[0].id,
  );

  // Without the document-sent event, the derived status should differ
  // from the ground truth expectation
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "current-status",
  );

  assert.ok(expectation, "Ground truth has current-status expectation");

  // The derived value should NOT match the expected value when the
  // document-sent event is missing, because the waiting state is no longer superseded
  assert.notEqual(
    derived.value,
    expectation.expectedValue,
    "Removing document-sent event changes the derived status",
  );
});

test("mutation: removing approval-requested event breaks derivation", () => {
  // Remove the APPROVAL_REQUESTED event
  const eventsWithoutApproval = extractedEvents.filter(
    (e) => e.eventType !== "APPROVAL_REQUESTED",
  );

  const derived = deriveCurrentStatusSlot(
    eventsWithoutApproval,
    syntheticMatters[0].id,
  );

  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "current-status",
  );

  assert.ok(expectation, "Ground truth has current-status expectation");

  // Without approval-requested, we cannot derive the same status
  assert.notEqual(
    derived.value,
    expectation.expectedValue,
    "Removing approval-requested event changes the derived status",
  );
});

test("derived slot uses only non-superseded events as evidence", () => {
  const derived = deriveCurrentStatusSlot(
    extractedEvents,
    syntheticMatters[0].id,
  );

  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "current-status",
  );

  assert.ok(expectation, "Ground truth has current-status expectation");

  // Map evidence artifact IDs back to event IDs
  const artifactToEventsMap = new Map<string, string[]>();
  for (const event of extractedEvents) {
    const artifactId = event.provenance.sourceArtifactId;
    if (!artifactToEventsMap.has(artifactId)) {
      artifactToEventsMap.set(artifactId, []);
    }
    artifactToEventsMap.get(artifactId)!.push(event.eventId);
  }

  // Get all event IDs referenced by the derived evidence
  const derivedEventIds = new Set<string>();
  for (const artifactId of derived.evidenceIds) {
    const eventIds = artifactToEventsMap.get(artifactId) ?? [];
    for (const eventId of eventIds) {
      derivedEventIds.add(eventId);
    }
  }

  // Verify that superseded events are not used
  for (const supersededId of expectation.supersededEventIds) {
    assert.ok(
      !derivedEventIds.has(supersededId),
      `Superseded event ${supersededId} is not used in derived evidence`,
    );
  }
});

test("derivation is deterministic across multiple calls", () => {
  const derived1 = deriveCurrentStatusSlot(
    extractedEvents,
    syntheticMatters[0].id,
  );
  const derived2 = deriveCurrentStatusSlot(
    extractedEvents,
    syntheticMatters[0].id,
  );

  assert.deepEqual(
    derived1,
    derived2,
    "Multiple derivation calls produce identical results",
  );
});

test("derivation uses only events from the specified matter", () => {
  // This test verifies matter isolation in the derivation logic
  const derived = deriveCurrentStatusSlot(
    extractedEvents,
    syntheticMatters[0].id,
  );

  // All evidence IDs should map to events belonging to the selected matter
  const eventMap = new Map(
    extractedEvents.map((event) => [
      event.provenance.sourceArtifactId,
      event,
    ]),
  );

  for (const artifactId of derived.evidenceIds) {
    const event = eventMap.get(artifactId);
    assert.ok(event, `Evidence artifact ${artifactId} has a corresponding event`);
    assert.equal(
      event.matterId,
      syntheticMatters[0].id,
      `Event from artifact ${artifactId} belongs to the selected matter`,
    );
  }
});
