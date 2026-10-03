import assert from "node:assert/strict";
import test from "node:test";
import type { OperationalEvent } from "@/types/mattermind";
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

// Synthetic non-fixture matter tests
test("non-fixture matter: contract draft awaiting attorney review", () => {
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-doc-1",
      matterId: "test-matter-001",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Legal Team",
      action: "Sent draft contract for review",
      object: "Draft contract",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "draft contract",
      },
    },
    {
      eventId: "test-review-1",
      matterId: "test-matter-001",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T11:00:00Z",
      actor: "Associate",
      action: "Requested attorney review of the contract",
      object: "Draft contract",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-2",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T11:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "need your review",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(syntheticEvents, "test-matter-001");

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Draft contract is awaiting attorney review.");
  assert.deepEqual(derived.evidenceIds, ["test-artifact-1", "test-artifact-2"]);
});

test("non-fixture matter: proposed agreement from client", () => {
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-doc-2",
      matterId: "test-matter-002",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-20T14:00:00Z",
      actor: "Client",
      action: "Sent proposed terms",
      object: "Proposed agreement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-3",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-20T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "proposed agreement",
      },
    },
    {
      eventId: "test-approval-2",
      matterId: "test-matter-002",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-20T15:30:00Z",
      actor: "Attorney",
      action: "Requested client approval on proposed terms",
      object: "Proposed agreement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-4",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-20T15:30:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "need client approval",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(syntheticEvents, "test-matter-002");

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Proposed agreement is awaiting client approval.");
  assert.deepEqual(derived.evidenceIds, ["test-artifact-3", "test-artifact-4"]);
});

test("non-fixture matter: waiting superseded by later action", () => {
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-waiting-1",
      matterId: "test-matter-003",
      eventType: "WAITING_STATE_REPORTED",
      occurredAt: "2026-08-15T09:00:00Z",
      actor: "Attorney",
      action: "Waiting for opposing counsel response",
      object: "opposing counsel response",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-5",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-08-15T09:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "waiting for response",
      },
    },
    {
      eventId: "test-doc-3",
      matterId: "test-matter-003",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-08-18T10:00:00Z",
      actor: "Opposing Counsel",
      action: "Sent response brief",
      object: "Response brief",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-6",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-08-18T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "response brief attached",
      },
    },
    {
      eventId: "test-approval-3",
      matterId: "test-matter-003",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-08-18T11:00:00Z",
      actor: "Attorney",
      action: "Requested your approval to proceed",
      object: "Response brief",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-7",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-08-18T11:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "your approval needed",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(syntheticEvents, "test-matter-003");

  // The waiting state should be superseded; status should reflect the later events
  assert.equal(derived.state, "SUPPORTED");
  // Should NOT mention "waiting for opposing counsel response"
  assert.ok(!derived.value.toLowerCase().includes("waiting for opposing counsel"));
  // Should reference the approval request
  assert.ok(derived.value.toLowerCase().includes("awaiting"));
  assert.deepEqual(derived.evidenceIds, ["test-artifact-6", "test-artifact-7"]);
});

test("event ordering: latest by timestamp, not array position", () => {
  // Events intentionally out of chronological order in the array
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-later",
      matterId: "test-matter-004",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-07-20T15:00:00Z",
      actor: "Attorney",
      action: "Requested client decision",
      object: "Memo",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-9",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-07-20T15:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "decision needed",
      },
    },
    {
      eventId: "test-earlier",
      matterId: "test-matter-004",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-07-20T14:00:00Z",
      actor: "Attorney",
      action: "Sent analysis memo",
      object: "Analysis memo",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-8",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-07-20T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "analysis attached",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(syntheticEvents, "test-matter-004");

  // Should use the chronologically later event, not the last in array
  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.evidenceIds.length, 2);
  // Should reference both events in chronological order
  assert.ok(derived.evidenceIds.includes("test-artifact-8"));
  assert.ok(derived.evidenceIds.includes("test-artifact-9"));
});

test("supersession comparison: earlier event must be superseded by later event", () => {
  // This test verifies that the > comparison is correct (not <)
  // If the comparison is flipped, supersession won't work correctly
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-wait-first",
      matterId: "test-matter-supersession",
      eventType: "WAITING_STATE_REPORTED",
      occurredAt: "2026-05-01T10:00:00Z",
      actor: "Attorney",
      action: "Waiting for documents",
      object: "documents",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-05-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "waiting",
      },
    },
    {
      eventId: "test-doc-arrives",
      matterId: "test-matter-supersession",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-05-02T14:00:00Z",
      actor: "Client",
      action: "Sent documents",
      object: "Documents",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-05-02T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "documents attached",
      },
    },
    {
      eventId: "test-approval",
      matterId: "test-matter-supersession",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-05-02T15:00:00Z",
      actor: "Attorney",
      action: "Requested your approval",
      object: "Documents",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-approval",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-05-02T15:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval needed",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-matter-supersession",
  );

  // The status should be based on the later events (doc + approval), not the waiting event
  // If comparison is flipped (<), the waiting event won't be superseded
  
  // Check that the derived value doesn't say "Waiting for documents"
  assert.ok(
    !derived.value.includes("Waiting for documents"),
    `Status should not be "Waiting for documents" because that event is superseded. Got: ${derived.value}`,
  );
  
  // Should reference the later events, not the waiting event
  assert.ok(
    !derived.evidenceIds.includes("test-artifact-wait"),
    "Should not reference the superseded waiting event",
  );
  assert.ok(
    derived.evidenceIds.includes("test-artifact-doc") ||
      derived.evidenceIds.includes("test-artifact-approval"),
    "Should reference the later doc or approval events",
  );
});

test("supersession: waiting event superseded by document-sent (no approval)", () => {
  // This test catches the flipped comparison mutation
  // It has ONLY waiting + document events (no approval to override)
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "wait-1",
      matterId: "test-m-flip",
      eventType: "WAITING_STATE_REPORTED",
      occurredAt: "2026-04-01T10:00:00Z",
      actor: "Attorney",
      action: "Waiting for brief",
      object: "brief",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "art-wait",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-04-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "waiting",
      },
    },
    {
      eventId: "doc-arrives-later",
      matterId: "test-m-flip",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-04-03T14:00:00Z",
      actor: "Opposing",
      action: "Sent brief",
      object: "Brief",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "art-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-04-03T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "brief",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(syntheticEvents, "test-m-flip");

  // With correct comparison (>): waiting is superseded, status describes the document event
  // With flipped comparison (<): waiting is NOT superseded, status says "Waiting for brief"
  assert.ok(
    !derived.value.includes("Waiting for brief"),
    `Should not show superseded waiting state. Got: ${derived.value}`,
  );
  assert.ok(
    !derived.evidenceIds.includes("art-wait"),
    "Should not reference superseded waiting event",
  );
});

test("timestamp tie-breaker: uses eventId lexicographically", () => {
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-event-aaa",
      matterId: "test-matter-005",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-06-10T12:00:00Z",
      actor: "Attorney A",
      action: "Requested approval A",
      object: "Document A",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-10",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-06-10T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval A",
      },
    },
    {
      eventId: "test-event-zzz",
      matterId: "test-matter-005",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-06-10T12:00:00Z",
      actor: "Attorney B",
      action: "Requested approval B",
      object: "Document B",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-11",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-06-10T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval B",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(syntheticEvents, "test-matter-005");

  // With identical timestamps, should use the event with higher eventId (zzz > aaa)
  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.evidenceIds[0], "test-artifact-11");
});
