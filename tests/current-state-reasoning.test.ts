import assert from "node:assert/strict";
import test from "node:test";
import type { OperationalEvent, EligibleEvidenceItem, SyntheticMatter } from "@/types/mattermind";
import {
  syntheticEvidenceUniverse,
  syntheticMatters,
  syntheticOperationalEventGroundTruth,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import { syntheticCurrentStateGroundTruth } from "@/data/synthetic-current-state";
import { buildEligibleEvidenceSet } from "@/lib/evidence-processing";
import { extractOperationalEvents } from "@/lib/operational-events";
import { deriveCurrentStatusSlot, deriveLastImportantEventSlot, deriveWaitingOnSlot, deriveNextActionSlot, deriveOwnerSlot, deriveImportantDateSlot, deriveSignificantNewInformationSlot } from "@/lib/current-state-reasoning";

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
    syntheticMatters[0],
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
    syntheticMatters[0],
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
    syntheticMatters[0],
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
    syntheticMatters[0],
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
    syntheticMatters[0],
  );
  const derived2 = deriveCurrentStatusSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
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
    syntheticMatters[0],
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
  const testMatter = {
    id: "test-matter-001",
    matterNumber: "2026-TEST-001",
    name: "Contract Review Test",
    client: "Test Client Corp",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client", "test-attorney"],
  };
  
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

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-matter-001",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Draft contract is awaiting attorney review.");
  assert.deepEqual(derived.evidenceIds, ["test-artifact-1", "test-artifact-2"]);
});

test("non-fixture matter: proposed agreement from client", () => {
  const testMatter = {
    id: "test-matter-002",
    matterNumber: "2026-TEST-002",
    name: "Agreement Test",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client-2", "test-attorney-2"],
  };
  
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

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-matter-002",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Proposed agreement is awaiting client approval.");
  assert.deepEqual(derived.evidenceIds, ["test-artifact-3", "test-artifact-4"]);
});

test("non-fixture matter: waiting superseded by later action", () => {
  const testMatter = {
    id: "test-matter-003",
    matterNumber: "2026-TEST-003",
    name: "Supersession Test",
    client: "Test Client 3",
    responsibleAttorney: "Test Attorney 3",
    status: "Active" as const,
    participantIds: ["test-client-3"],
  };
  
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

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-matter-003",
    testMatter,
  );

  // The waiting state should be superseded; status should reflect the later events
  assert.equal(derived.state, "SUPPORTED");
  // Should NOT mention "waiting for opposing counsel response"
  assert.ok(!derived.value.toLowerCase().includes("waiting for opposing counsel"));
  // Should reference the approval request
  assert.ok(derived.value.toLowerCase().includes("awaiting"));
  assert.deepEqual(derived.evidenceIds, ["test-artifact-6", "test-artifact-7"]);
});

test("event ordering: latest by timestamp, not array position", () => {
  const testMatter = {
    id: "test-matter-004",
    matterNumber: "2026-TEST-004",
    name: "Ordering Test",
    client: "Test Client 4",
    responsibleAttorney: "Test Attorney 4",
    status: "Active" as const,
    participantIds: ["test-client-4"],
  };
  
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

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-matter-004",
    testMatter,
  );

  // Should use the chronologically later event, not the last in array
  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.evidenceIds.length, 2);
  // Should reference both events in chronological order
  assert.ok(derived.evidenceIds.includes("test-artifact-8"));
  assert.ok(derived.evidenceIds.includes("test-artifact-9"));
});

test("supersession comparison: earlier event must be superseded by later event", () => {
  const testMatter = {
    id: "test-matter-supersession",
    matterNumber: "2026-TEST-SUP",
    name: "Supersession Test",
    client: "Test Client 5",
    responsibleAttorney: "Test Attorney 5",
    status: "Active" as const,
    participantIds: ["test-client-5"],
  };
  
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
    testMatter,
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
  const testMatter = {
    id: "test-m-flip",
    matterNumber: "2026-TEST-FLIP",
    name: "Flip Test",
    client: "Test Client 6",
    responsibleAttorney: "Test Attorney 6",
    status: "Active" as const,
    participantIds: ["test-client-6"],
  };
  
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

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-m-flip",
    testMatter,
  );

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

test("non-client possessive approval: Judge Lee's approval != client approval", () => {
  const testMatter = {
    id: "test-matter-judge",
    matterNumber: "2026-TEST-JUDGE",
    name: "Court Approval Test",
    client: "Jane Doe",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client-jane", "test-attorney"],
  };
  
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-order-doc",
      matterId: "test-matter-judge",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-05-10T10:00:00Z",
      actor: "Attorney",
      action: "Sent proposed order",
      object: "Proposed order",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-art-order",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-05-10T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "proposed order",
      },
    },
    {
      eventId: "test-judge-approval",
      matterId: "test-matter-judge",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-05-10T11:00:00Z",
      actor: "Attorney",
      action: "Requested Judge Lee's approval of the proposed order",
      object: "Proposed order",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-art-judge-req",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-05-10T11:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "need Judge Lee's approval",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-matter-judge",
    testMatter,
  );

  // Should NOT say "client approval" because Judge Lee is not the client (Jane Doe is)
  assert.ok(
    !derived.value.includes("client approval"),
    `Should not say 'client approval' when approval is from Judge Lee, not client Jane Doe. Got: ${derived.value}`,
  );
  // Should mention Judge Lee's name or just say "approval"
  assert.ok(
    derived.value.includes("Judge Lee") || derived.value.endsWith("approval."),
    `Should mention Judge Lee or use generic 'approval'. Got: ${derived.value}`,
  );
});

test("current-status: object text keeps original proper-noun casing", () => {
  const testMatter = {
    id: "test-matter-status-casing",
    matterNumber: "2026-STATUS-CASING",
    name: "Casing Test",
    client: "Jane Doe",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-status-casing-doc",
      matterId: "test-matter-status-casing",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-05-10T10:00:00Z",
      actor: "Attorney",
      action: "Sent Judge Lee's ruling notes",
      object: "Judge Lee's ruling",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-art-status-casing-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-05-10T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "Judge Lee's ruling",
      },
    },
    {
      eventId: "test-status-casing-approval",
      matterId: "test-matter-status-casing",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-05-10T11:00:00Z",
      actor: "Attorney",
      action: "Requested attorney review of Judge Lee's ruling",
      object: "Judge Lee's ruling",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-art-status-casing-approval",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-05-10T11:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "need review",
      },
    },
  ];

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-matter-status-casing",
    testMatter,
  );

  assert.ok(
    derived.value.includes("Judge Lee's ruling"),
    "Current-status object must keep proper-noun casing",
  );
  assert.ok(
    !derived.value.includes("judge lee's ruling"),
    "Current-status object must not be lowercased",
  );
});

test("timestamp tie-breaker: uses eventId lexicographically", () => {
  const testMatter = {
    id: "test-matter-005",
    matterNumber: "2026-TEST-005",
    name: "Tie Test",
    client: "Test Client 7",
    responsibleAttorney: "Test Attorney 7",
    status: "Active" as const,
    participantIds: ["test-client-7"],
  };
  
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

  const derived = deriveCurrentStatusSlot(
    syntheticEvents,
    "test-matter-005",
    testMatter,
  );

  // With identical timestamps, should use the event with higher eventId (zzz > aaa)
  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.evidenceIds[0], "test-artifact-11");
});

// Tests for last-important-event slot derivation
test("derived last-important-event slot matches ground-truth expectation", () => {
  const derived = deriveLastImportantEventSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "last-important-event",
  );

  assert.ok(expectation, "Ground truth has last-important-event expectation");

  assert.equal(
    derived.id,
    "last-important-event",
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

test("last-important-event: identifies most recent event by timestamp", () => {
  const testMatter = {
    id: "test-matter-lie-001",
    matterNumber: "2026-LIE-001",
    name: "Last Event Test",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client"],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-event-1",
      matterId: "test-matter-lie-001",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-10T10:00:00Z",
      actor: "Attorney",
      action: "Sent initial draft",
      object: "Draft",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-10T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "draft",
      },
    },
    {
      eventId: "test-event-2",
      matterId: "test-matter-lie-001",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-15T14:30:00Z",
      actor: "Attorney",
      action: "Requested client approval",
      object: "Draft",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-2",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-15T14:30:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval needed",
      },
    },
  ];

  const derived = deriveLastImportantEventSlot(
    syntheticEvents,
    "test-matter-lie-001",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  // Should use the later event (Sep 15)
  assert.equal(derived.evidenceIds[0], "test-artifact-2");
  assert.ok(derived.value.includes("September 15, 2026"));
  assert.ok(derived.value.includes("Attorney requested client approval"));
});

test("last-important-event: formats date and actor correctly", () => {
  const testMatter = {
    id: "test-matter-lie-002",
    matterNumber: "2026-LIE-002",
    name: "Format Test",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client"],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-event-format",
      matterId: "test-matter-lie-002",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-17T17:45:00Z",
      actor: "Alex Thompson",
      action: "Requested Jordan Smith's approval before responding.",
      object: "Document",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-format",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T17:45:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval",
      },
    },
  ];

  const derived = deriveLastImportantEventSlot(
    syntheticEvents,
    "test-matter-lie-002",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  // Should format as: "{Month} {Day}, {Year} — {Actor} {action}."
  // Actor should be preserved as-is when not matching responsible attorney
  assert.ok(derived.value.includes("September 17, 2026"));
  assert.ok(derived.value.includes("Alex Thompson"));
});

test("last-important-event: excludes record-keeping events (substantive event wins)", () => {
  const testMatter = {
    id: "test-matter-lie-003",
    matterNumber: "2026-LIE-003",
    name: "Record Keeping Test",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client"],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-event-substantive",
      matterId: "test-matter-lie-003",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T09:00:00Z",
      actor: "Test Attorney",
      action: "Requested client approval",
      object: "Document",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-substantive",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T09:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval",
      },
    },
    {
      eventId: "test-event-record-keeping",
      matterId: "test-matter-lie-003",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-18T10:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-record",
        sourceSystem: "Clio",
        sourceRecordedAt: "2026-09-18T10:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt: "status",
      },
    },
  ];

  const derived = deriveLastImportantEventSlot(
    syntheticEvents,
    "test-matter-lie-003",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  // MF2: Should select the substantive event (Sep 17) not the later record-keeping event (Sep 18)
  assert.equal(derived.evidenceIds[0], "test-artifact-substantive");
  assert.ok(derived.value.includes("September 17, 2026"));
  assert.ok(derived.value.includes("Attorney"));
});

test("last-important-event: returns UNKNOWN when no events", () => {
  const testMatter = {
    id: "nonexistent-matter",
    matterNumber: "2026-NONE",
    name: "Nonexistent",
    client: "None",
    responsibleAttorney: "None",
    status: "Active" as const,
    participantIds: [],
  };

  const derived = deriveLastImportantEventSlot(
    [],
    "nonexistent-matter",
    testMatter,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.equal(derived.evidenceIds.length, 0);
});

test("last-important-event: uses eventId as tie-breaker for same timestamp", () => {
  const testMatter = {
    id: "test-matter-lie-004",
    matterNumber: "2026-LIE-004",
    name: "Tie Breaker Test",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client"],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-event-aaa",
      matterId: "test-matter-lie-004",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-15T12:00:00Z",
      actor: "Attorney A",
      action: "Requested approval A",
      object: "Document A",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-a",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-15T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval A",
      },
    },
    {
      eventId: "test-event-zzz",
      matterId: "test-matter-lie-004",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-15T12:00:00Z",
      actor: "Attorney B",
      action: "Requested approval B",
      object: "Document B",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-b",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-15T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval B",
      },
    },
  ];

  const derived = deriveLastImportantEventSlot(
    syntheticEvents,
    "test-matter-lie-004",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  // With identical timestamps, should use the event with higher eventId (zzz > aaa)
  assert.equal(derived.evidenceIds[0], "test-artifact-b");
  assert.ok(derived.value.includes("Attorney B requested approval B"));
});

test("last-important-event: deterministic across multiple calls", () => {
  const derived1 = deriveLastImportantEventSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
  );
  const derived2 = deriveLastImportantEventSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
  );

  assert.deepEqual(
    derived1,
    derived2,
    "Multiple derivation calls produce identical results",
  );
});

test("last-important-event: uses only events from specified matter", () => {
  const testMatter = {
    id: "matter-1",
    matterNumber: "2026-M1",
    name: "Matter 1",
    client: "Client 1",
    responsibleAttorney: "Attorney",
    status: "Active" as const,
    participantIds: [],
  };

  const multiMatterEvents: OperationalEvent[] = [
    {
      eventId: "matter-1-event",
      matterId: "matter-1",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-20T10:00:00Z",
      actor: "Attorney",
      action: "Requested approval",
      object: "Document",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "artifact-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-20T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval",
      },
    },
    {
      eventId: "matter-2-event",
      matterId: "matter-2",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-21T10:00:00Z",
      actor: "Attorney",
      action: "Sent document",
      object: "Document",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "artifact-2",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-21T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "document",
      },
    },
  ];

  const derived = deriveLastImportantEventSlot(
    multiMatterEvents,
    "matter-1",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  // Should only use matter-1 event, even though matter-2 event is later
  assert.equal(derived.evidenceIds[0], "artifact-1");
  assert.ok(derived.value.includes("September 20, 2026"));
});

test("last-important-event: handles events out of chronological order in array", () => {
  const testMatter = {
    id: "test-matter-lie-005",
    matterNumber: "2026-LIE-005",
    name: "Order Test",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client"],
  };

  // Events intentionally out of chronological order
  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-later",
      matterId: "test-matter-lie-005",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-20T15:00:00Z",
      actor: "Attorney",
      action: "Requested decision",
      object: "Memo",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-later",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-20T15:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "decision",
      },
    },
    {
      eventId: "test-earlier",
      matterId: "test-matter-lie-005",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-19T14:00:00Z",
      actor: "Attorney",
      action: "Sent analysis",
      object: "Analysis",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-earlier",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-19T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "analysis",
      },
    },
  ];

  const derived = deriveLastImportantEventSlot(
    syntheticEvents,
    "test-matter-lie-005",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  // Should use chronologically later event (Sep 20), not last in array
  assert.equal(derived.evidenceIds[0], "test-artifact-later");
  assert.ok(derived.value.includes("September 20, 2026"));
  assert.ok(derived.value.includes("Attorney requested decision"));
});

test("last-important-event: handles regex special characters in client name", () => {
  const testMatter = {
    id: "test-matter-lie-006",
    matterNumber: "2026-LIE-006",
    name: "Regex Special Char Test",
    client: "Jordan Smith (Trustee)",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client"],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-event-regex",
      matterId: "test-matter-lie-006",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T10:00:00Z",
      actor: "Test Attorney",
      action: "Requested Jordan Smith (Trustee)'s approval of the settlement.",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-regex",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval",
      },
    },
  ];

  const derived = deriveLastImportantEventSlot(
    syntheticEvents,
    "test-matter-lie-006",
    testMatter,
  );

  assert.equal(derived.state, "SUPPORTED");
  // MF3: Should correctly handle parentheses without regex errors
  assert.ok(derived.value.includes("September 17, 2026"));
  assert.ok(!derived.value.includes("[REGEX ERROR]"));
});

// ===== Waiting-on slot tests =====

test("derived waiting-on slot matches ground-truth expectation", () => {
  const derived = deriveWaitingOnSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
    evidenceProcessing.eligibleEvidence,
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "waiting-on",
  );

  assert.ok(expectation, "Ground truth has waiting-on expectation");

  assert.equal(
    derived.id,
    "waiting-on",
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

test("waiting-on: open approval request is detected", () => {
  const testMatter = {
    id: "test-matter-wait-001",
    matterNumber: "2026-WAIT-001",
    name: "Open Wait Test",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client"],
  };

  const testEvidence = [
    {
      id: "test-artifact-wait-1",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-10-01T10:00:00Z",
      from: "attorney@example.com",
      to: ["test.client@example.com"],
      subject: "Approval needed",
      content: "Please approve the settlement terms",
      participants: ["test-client"],
      authorizedUserIds: ["test-user"],
      association: {
        evidenceId: "test-artifact-wait-1",
        status: "ASSOCIATED" as const,
        method: "EXPLICIT_MATTER_ID" as const,
        reason: "test",
      },
      provenance: {
        source: "Outlook" as const,
        originalArtifactId: "test-artifact-wait-1",
        associationMethod: "EXPLICIT_MATTER_ID" as const,
        retrieved: "synthetic request execution" as const,
      },
    },
  ];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approval-open",
      matterId: "test-matter-wait-001",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Attorney",
      action: "Requested client approval of the settlement terms",
      object: "Settlement terms",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "need your approval",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-wait-001",
    testMatter,
    testEvidence,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Client approval");
  assert.deepEqual(derived.evidenceIds, ["test-artifact-wait-1"]);
});

test("waiting-on: waiting state superseded by later event", () => {
  const testMatter = {
    id: "test-matter-wait-002",
    matterNumber: "2026-WAIT-002",
    name: "Superseded Wait Test",
    client: "Test Client 2",
    responsibleAttorney: "Test Attorney 2",
    status: "Active" as const,
    participantIds: ["test-client-2"],
  };

  const testEvidence = [
    {
      id: "test-artifact-wait-2",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-09-01T10:00:00Z",
      participants: [],
      authorizedUserIds: [],
      association: { evidenceId: "", status: "ASSOCIATED" as const, method: "EXPLICIT_MATTER_ID" as const, reason: "" },
      provenance: { source: "Outlook" as const, originalArtifactId: "", associationMethod: "EXPLICIT_MATTER_ID" as const, retrieved: "synthetic request execution" as const },
      content: "",
    },
    {
      id: "test-artifact-wait-3",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-09-05T14:00:00Z",
      participants: [],
      authorizedUserIds: [],
      association: { evidenceId: "", status: "ASSOCIATED" as const, method: "EXPLICIT_MATTER_ID" as const, reason: "" },
      provenance: { source: "Outlook" as const, originalArtifactId: "", associationMethod: "EXPLICIT_MATTER_ID" as const, retrieved: "synthetic request execution" as const },
      content: "",
    },
    {
      id: "test-artifact-wait-4",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-09-06T11:00:00Z",
      from: "attorney@example.com",
      to: ["test.client.2@example.com"],
      participants: [],
      authorizedUserIds: [],
      association: { evidenceId: "", status: "ASSOCIATED" as const, method: "EXPLICIT_MATTER_ID" as const, reason: "" },
      provenance: { source: "Outlook" as const, originalArtifactId: "", associationMethod: "EXPLICIT_MATTER_ID" as const, retrieved: "synthetic request execution" as const },
      content: "",
    },
  ];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-waiting-old",
      matterId: "test-matter-wait-002",
      eventType: "WAITING_STATE_REPORTED",
      occurredAt: "2026-09-01T10:00:00Z",
      actor: "Attorney",
      action: "Waiting for documents",
      object: "Documents",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-2",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "waiting for documents",
      },
    },
    {
      eventId: "test-doc-received",
      matterId: "test-matter-wait-002",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-05T14:00:00Z",
      actor: "Client",
      action: "Sent documents",
      object: "Documents",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-3",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-05T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "documents attached",
      },
    },
    {
      eventId: "test-approval-new",
      matterId: "test-matter-wait-002",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-06T11:00:00Z",
      actor: "Attorney",
      action: "Requested client approval",
      object: "Analysis",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-4",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-06T11:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "need approval",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-wait-002",
    testMatter,
    testEvidence,
  );

  // The old waiting state should be superseded; should show the new approval request
  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Client approval");
  assert.deepEqual(derived.evidenceIds, ["test-artifact-wait-4"]);
});

test("waiting-on: multiple open waits, uses most recent", () => {
  const testMatter = {
    id: "test-matter-wait-003",
    matterNumber: "2026-WAIT-003",
    name: "Multiple Waits Test",
    client: "Test Client 3",
    responsibleAttorney: "Test Attorney 3",
    status: "Active" as const,
    participantIds: ["test-client-3"],
  };

  const testEvidence = [
    {
      id: "test-artifact-wait-5",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-09-10T10:00:00Z",
      participants: [],
      authorizedUserIds: [],
      association: { evidenceId: "", status: "ASSOCIATED" as const, method: "EXPLICIT_MATTER_ID" as const, reason: "" },
      provenance: { source: "Outlook" as const, originalArtifactId: "", associationMethod: "EXPLICIT_MATTER_ID" as const, retrieved: "synthetic request execution" as const },
      content: "",
    },
    {
      id: "test-artifact-wait-6",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-09-15T14:00:00Z",
      from: "attorney@example.com",
      to: ["test.client.3@example.com"],
      participants: [],
      authorizedUserIds: [],
      association: { evidenceId: "", status: "ASSOCIATED" as const, method: "EXPLICIT_MATTER_ID" as const, reason: "" },
      provenance: { source: "Outlook" as const, originalArtifactId: "", associationMethod: "EXPLICIT_MATTER_ID" as const, retrieved: "synthetic request execution" as const },
      content: "",
    },
  ];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approval-1",
      matterId: "test-matter-wait-003",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-10T10:00:00Z",
      actor: "Attorney",
      action: "Requested attorney approval",
      object: "Brief",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-5",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-10T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "need attorney approval",
      },
    },
    {
      eventId: "test-approval-2",
      matterId: "test-matter-wait-003",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-15T14:00:00Z",
      actor: "Attorney",
      action: "Requested client approval",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-6",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-15T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "need client approval",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-wait-003",
    testMatter,
    testEvidence,
  );

  // Should use the most recent approval request (Sep 15)
  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Client approval");
  assert.deepEqual(derived.evidenceIds, ["test-artifact-wait-6"]);
});

test("waiting-on: no open waits returns UNKNOWN", () => {
  const testMatter = {
    id: "test-matter-wait-004",
    matterNumber: "2026-WAIT-004",
    name: "No Waits Test",
    client: "Test Client 4",
    responsibleAttorney: "Test Attorney 4",
    status: "Active" as const,
    participantIds: ["test-client-4"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-doc-only",
      matterId: "test-matter-wait-004",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-20T10:00:00Z",
      actor: "Attorney",
      action: "Sent memo",
      object: "Memo",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-7",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-20T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "memo attached",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-wait-004",
    testMatter,
    testEvidence,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.deepEqual(derived.evidenceIds, []);
});

test("waiting-on: matter isolation - only uses events from specified matter", () => {
  const testMatter1 = {
    id: "test-matter-wait-005a",
    matterNumber: "2026-WAIT-005A",
    name: "Matter A",
    client: "Client A",
    responsibleAttorney: "Attorney A",
    status: "Active" as const,
    participantIds: ["client-a"],
  };

  const testMatter2 = {
    id: "test-matter-wait-005b",
    matterNumber: "2026-WAIT-005B",
    name: "Matter B",
    client: "Client B",
    responsibleAttorney: "Attorney B",
    status: "Active" as const,
    participantIds: ["client-b"],
  };

  const testEvidence: EligibleEvidenceItem[] = [
    {
      id: "test-artifact-wait-8",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-09-25T10:00:00Z",
      from: "attorney.a@lawfirm.example",
      to: ["client.a@company.example"],
      subject: "Settlement A approval needed",
      content: "Please approve Settlement A",
      participants: ["client-a"],
      authorizedUserIds: ["test-user"],
      association: {
        evidenceId: "test-artifact-wait-8",
        status: "ASSOCIATED" as const,
        method: "EXPLICIT_MATTER_ID" as const,
        reason: "test",
      },
      provenance: {
        source: "Outlook" as const,
        originalArtifactId: "test-artifact-wait-8",
        associationMethod: "EXPLICIT_MATTER_ID" as const,
        retrieved: "synthetic request execution" as const,
      },
    },
    {
      id: "test-artifact-wait-9",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-09-26T14:00:00Z",
      from: "attorney.b@lawfirm.example",
      to: ["paralegal@lawfirm.example"],
      subject: "Brief B approval needed",
      content: "Please approve Brief B",
      participants: ["paralegal"],
      authorizedUserIds: ["test-user"],
      association: {
        evidenceId: "test-artifact-wait-9",
        status: "ASSOCIATED" as const,
        method: "EXPLICIT_MATTER_ID" as const,
        reason: "test",
      },
      provenance: {
        source: "Outlook" as const,
        originalArtifactId: "test-artifact-wait-9",
        associationMethod: "EXPLICIT_MATTER_ID" as const,
        retrieved: "synthetic request execution" as const,
      },
    },
  ];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approval-matter-a",
      matterId: "test-matter-wait-005a",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-25T10:00:00Z",
      actor: "Attorney A",
      action: "Requested client approval",
      object: "Settlement A",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-8",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-25T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "matter A approval",
      },
    },
    {
      eventId: "test-approval-matter-b",
      matterId: "test-matter-wait-005b",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-26T14:00:00Z",
      actor: "Attorney B",
      action: "Requested attorney approval",
      object: "Brief B",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-wait-9",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-26T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "matter B approval",
      },
    },
  ];

  const derivedA = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-wait-005a",
    testMatter1,
    testEvidence,
  );
  const derivedB = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-wait-005b",
    testMatter2,
    testEvidence,
  );

  // Matter A should only see its own approval
  assert.equal(derivedA.state, "SUPPORTED");
  assert.equal(derivedA.value, "Client approval");
  assert.deepEqual(derivedA.evidenceIds, ["test-artifact-wait-8"]);

  // Matter B should only see its own approval
  // Text fallback used since recipient is not the client
  assert.equal(derivedB.state, "INFERRED");
  assert.equal(derivedB.value, "Attorney approval");
  assert.deepEqual(derivedB.evidenceIds, ["test-artifact-wait-9"]);
});

test("waiting-on: no events returns UNKNOWN", () => {
  const testMatter = {
    id: "test-matter-wait-006",
    matterNumber: "2026-WAIT-006",
    name: "Empty Matter Test",
    client: "Test Client 6",
    responsibleAttorney: "Test Attorney 6",
    status: "Active" as const,
    participantIds: ["test-client-6"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const derived = deriveWaitingOnSlot(
    [],
    "test-matter-wait-006",
    testMatter,
    testEvidence,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.deepEqual(derived.evidenceIds, []);
});

// MF2: Edge cases for name matching and text fallback
test("waiting-on MF2: short name substring does not match (Al vs Alan Smith)", () => {
  const testMatter = {
    id: "test-matter-mf2-001",
    matterNumber: "2026-MF2-001",
    name: "Short Name Test",
    client: "Alan Smith",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["alan-smith"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-short-name",
      matterId: "test-matter-mf2-001",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Attorney",
      action: "Requested Al's approval",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "Al's approval",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-001",
    testMatter,
    testEvidence,
  );

  // "Al" should NOT match "Alan Smith" (whole-token matching)
  // Should fall back to generic "Approval" and mark INFERRED
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Approval");
});

test("waiting-on MF2: curly apostrophe in client name", () => {
  const testMatter = {
    id: "test-matter-mf2-002",
    matterNumber: "2026-MF2-002",
    name: "Curly Apostrophe Test",
    client: "Jordan Smith",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["jordan-smith"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-curly",
      matterId: "test-matter-mf2-002",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Attorney",
      action: "Requested Jordan Smith\u2019s approval",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-2",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval needed",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-002",
    testMatter,
    testEvidence,
  );

  // Curly apostrophe should be normalized and match
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Client approval");
});

test("waiting-on MF2: non-client approver (Ann vs Joanne Smith)", () => {
  const testMatter = {
    id: "test-matter-mf2-003",
    matterNumber: "2026-MF2-003",
    name: "Non-Client Test",
    client: "Joanne Smith",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["joanne-smith"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-ann",
      matterId: "test-matter-mf2-003",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Attorney",
      action: "Requested Ann's approval",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-3",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "Ann's approval",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-003",
    testMatter,
    testEvidence,
  );

  // "Ann" should NOT match "Joanne Smith"
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Approval");
});

test("waiting-on MF2: name with apostrophe (O'Brien)", () => {
  const testMatter = {
    id: "test-matter-mf2-004",
    matterNumber: "2026-MF2-004",
    name: "O'Brien Test",
    client: "Pat O'Brien",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["pat-obrien"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-obrien",
      matterId: "test-matter-mf2-004",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Attorney",
      action: "Requested O'Brien's approval",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-4",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "O'Brien's approval",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-004",
    testMatter,
    testEvidence,
  );

  // Should match O'Brien (surname)
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Client approval");
});

test("waiting-on MF2: name with hyphen (Mary-Kate)", () => {
  const testMatter = {
    id: "test-matter-mf2-005",
    matterNumber: "2026-MF2-005",
    name: "Hyphen Test",
    client: "Mary-Kate Olsen",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["mary-kate"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-hyphen",
      matterId: "test-matter-mf2-005",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Attorney",
      action: "Requested Mary-Kate Olsen's approval",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-5",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "Mary-Kate's approval",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-005",
    testMatter,
    testEvidence,
  );

  // Should match full name with hyphen
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Client approval");
});

test("waiting-on MF2: 'approve' phrasing without 'approval' keyword", () => {
  const testMatter = {
    id: "test-matter-mf2-006",
    matterNumber: "2026-MF2-006",
    name: "Approve Phrasing Test",
    client: "Jordan Smith",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["jordan-smith"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approve",
      matterId: "test-matter-mf2-006",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Attorney",
      action: "Asked Jordan Smith to approve the revised language",
      object: "Revised settlement language",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-6",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "to approve",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-006",
    testMatter,
    testEvidence,
  );

  // Should still detect as approval
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Approval");
});

// MF3: Stale approval test
test("waiting-on MF3: approval with later substantive event is INFERRED", () => {
  const testMatter = {
    id: "test-matter-mf3-001",
    matterNumber: "2026-MF3-001",
    name: "Stale Approval Test",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["test-client"],
  };

  const testEvidence: EligibleEvidenceItem[] = [];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approval-early",
      matterId: "test-matter-mf3-001",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T10:00:00Z",
      actor: "Attorney",
      action: "Requested client approval",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf3-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval needed",
      },
    },
    {
      eventId: "test-doc-later",
      matterId: "test-matter-mf3-001",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-10-01T14:00:00Z",
      actor: "Attorney",
      action: "Sent revised document",
      object: "Revised document",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf3-2",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T14:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "revised",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf3-001",
    testMatter,
    testEvidence,
  );

  // Approval with later substantive event should be INFERRED, not SUPPORTED
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Client approval");
});

// MF2 (2): Email recipient substring false positives
test("waiting-on MF2: email substring false positive (jordan.smithson@ vs Jordan Smith)", () => {
  const testMatter = {
    id: "test-matter-mf2-email-001",
    matterNumber: "2026-MF2-EMAIL-001",
    name: "Email Substring Test 1",
    client: "Jordan Smith",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["jordan-smith"],
  };

  const testEvidence: EligibleEvidenceItem[] = [
    {
      id: "test-artifact-mf2-email-1",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-10-01T10:00:00Z",
      from: "attorney@lawfirm.example",
      to: ["jordan.smithson@acme-opposing.example"],
      subject: "Approval needed",
      content: "Please approve the settlement",
      participants: ["jordan-smithson"],
      authorizedUserIds: ["test-user"],
      association: {
        evidenceId: "test-artifact-mf2-email-1",
        status: "ASSOCIATED" as const,
        method: "EXPLICIT_MATTER_ID" as const,
        reason: "test",
      },
      provenance: {
        source: "Outlook" as const,
        originalArtifactId: "test-artifact-mf2-email-1",
        associationMethod: "EXPLICIT_MATTER_ID" as const,
        retrieved: "synthetic request execution" as const,
      },
    },
  ];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approval-substring-1",
      matterId: "test-matter-mf2-email-001",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-01T10:00:00Z",
      actor: "Attorney",
      action: "Requested approval before filing",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-email-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-01T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval needed",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-email-001",
    testMatter,
    testEvidence,
  );

  // jordan.smithson@ is NOT jordan.smith@, so should not match as Client approval
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Approval");
});

test("waiting-on MF2: email substring false positive (hal.smith@ vs Al Smith)", () => {
  const testMatter = {
    id: "test-matter-mf2-email-002",
    matterNumber: "2026-MF2-EMAIL-002",
    name: "Email Substring Test 2",
    client: "Al Smith",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["al-smith"],
  };

  const testEvidence: EligibleEvidenceItem[] = [
    {
      id: "test-artifact-mf2-email-2",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-10-02T10:00:00Z",
      from: "attorney@lawfirm.example",
      to: ["hal.smith@court.example"],
      subject: "Settlement approval",
      content: "Please approve",
      participants: ["hal-smith"],
      authorizedUserIds: ["test-user"],
      association: {
        evidenceId: "test-artifact-mf2-email-2",
        status: "ASSOCIATED" as const,
        method: "EXPLICIT_MATTER_ID" as const,
        reason: "test",
      },
      provenance: {
        source: "Outlook" as const,
        originalArtifactId: "test-artifact-mf2-email-2",
        associationMethod: "EXPLICIT_MATTER_ID" as const,
        retrieved: "synthetic request execution" as const,
      },
    },
  ];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approval-substring-2",
      matterId: "test-matter-mf2-email-002",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-02T10:00:00Z",
      actor: "Attorney",
      action: "Requested approval of settlement",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-email-2",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-02T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-email-002",
    testMatter,
    testEvidence,
  );

  // hal.smith@ is NOT al.smith@, so should not match as Client approval
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Approval");
});

// MF2 (3): Text fallback with artifact must be INFERRED
test("waiting-on MF2: text fallback with artifact is INFERRED", () => {
  const testMatter = {
    id: "test-matter-mf2-fallback-001",
    matterNumber: "2026-MF2-FALLBACK-001",
    name: "Text Fallback Test",
    client: "Jordan Smith",
    responsibleAttorney: "Test Attorney",
    status: "Active" as const,
    participantIds: ["jordan-smith"],
  };

  const testEvidence: EligibleEvidenceItem[] = [
    {
      id: "test-artifact-mf2-fallback-1",
      sourceSystem: "Outlook" as const,
      artifactType: "Email" as const,
      timestamp: "2026-10-03T10:00:00Z",
      from: "attorney@lawfirm.example",
      to: ["paralegal@lawfirm.example"],
      subject: "Approval needed",
      content: "Smith's approval requested",
      participants: ["paralegal"],
      authorizedUserIds: ["test-user"],
      association: {
        evidenceId: "test-artifact-mf2-fallback-1",
        status: "ASSOCIATED" as const,
        method: "EXPLICIT_MATTER_ID" as const,
        reason: "test",
      },
      provenance: {
        source: "Outlook" as const,
        originalArtifactId: "test-artifact-mf2-fallback-1",
        associationMethod: "EXPLICIT_MATTER_ID" as const,
        retrieved: "synthetic request execution" as const,
      },
    },
  ];

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approval-fallback",
      matterId: "test-matter-mf2-fallback-001",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-10-03T10:00:00Z",
      actor: "Attorney",
      action: "Requested Smith's approval before filing",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-mf2-fallback-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-10-03T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval requested",
      },
    },
  ];

  const derived = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-mf2-fallback-001",
    testMatter,
    testEvidence,
  );

  // Sent to paralegal, not client - text fallback detects "Smith's" but must be INFERRED
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Client approval");
});

// ============================================================================
// NEXT-ACTION SLOT TESTS
// ============================================================================

test("derived next-action slot matches ground-truth expectation", () => {
  const derived = deriveNextActionSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
    evidenceProcessing.eligibleEvidence,
    syntheticRequestingUser,
    syntheticCurrentStateGroundTruth.asOf,
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "next-action",
  );

  assert.ok(expectation, "Ground truth has next-action expectation");

  assert.equal(
    derived.id,
    "next-action",
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

test("next-action: open approval request with document context returns INFERRED", () => {
  const testMatter: SyntheticMatter = {
    id: "test-matter-na-001",
    matterNumber: "2026-NA001",
    name: "Test Matter NA001",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-doc-sent",
      matterId: "test-matter-na-001",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Opposing counsel",
      action: "Sent revised settlement language.",
      object: "Revised settlement language",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "revised settlement language",
      },
    },
    {
      eventId: "test-approval-requested",
      matterId: "test-matter-na-001",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before responding.",
      object: "Settlement language",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-approval",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before responding",
      },
    },
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-001",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "INFERRED", "State should be INFERRED");
  assert.ok(
    derived.value.toLowerCase().includes("respond"),
    "Value should mention responding",
  );
  assert.ok(
    derived.value.includes("opposing counsel"),
    "Value should identify opposing counsel as recipient (lowercased actor name)",
  );
  assert.equal(
    derived.evidenceIds[0],
    "test-artifact-approval",
    "Should cite the approval request artifact",
  );
});

test("next-action: open waiting-state returns INFERRED", () => {
  const testMatter: SyntheticMatter = {
    id: "test-matter-na-002",
    matterNumber: "2026-NA002",
    name: "Test Matter NA002",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-waiting",
      matterId: "test-matter-na-002",
      eventType: "WAITING_STATE_REPORTED",
      occurredAt: "2026-09-15T10:00:00Z",
      actor: "Attorney",
      action: "Reported waiting for court decision.",
      object: "Court decision",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-waiting",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-15T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "waiting for court decision",
      },
    },
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-002",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "INFERRED", "State should be INFERRED");
  assert.ok(
    derived.value.toLowerCase().includes("court decision"),
    "Value should mention what we're waiting for",
  );
  assert.equal(
    derived.evidenceIds[0],
    "test-artifact-waiting",
    "Should cite the waiting-state artifact",
  );
});

test("next-action: superseded waiting-state is ignored", () => {
  const testMatter: SyntheticMatter = {
    id: "test-matter-na-003",
    matterNumber: "2026-NA003",
    name: "Test Matter NA003",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-waiting",
      matterId: "test-matter-na-003",
      eventType: "WAITING_STATE_REPORTED",
      occurredAt: "2026-09-10T10:00:00Z",
      actor: "Attorney",
      action: "Reported waiting for document.",
      object: "Document",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-waiting",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-10T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "waiting for document",
      },
    },
    {
      eventId: "test-doc-sent",
      matterId: "test-matter-na-003",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-15T10:00:00Z",
      actor: "Opposing counsel",
      action: "Sent the document.",
      object: "Document",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-15T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "sent the document",
      },
    },
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-003",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  // The waiting state is superseded by document sent, so we infer from the document
  assert.equal(derived.state, "INFERRED", "State should be INFERRED");
  assert.ok(
    derived.value.toLowerCase().includes("review"),
    "Value should mention reviewing",
  );
  assert.equal(
    derived.evidenceIds[0],
    "test-artifact-doc",
    "Should cite the document artifact, not the superseded waiting",
  );
});

test("next-action: matter isolation works correctly", () => {
  const testMatter1: SyntheticMatter = {
    id: "test-matter-na-004",
    matterNumber: "2026-NA004",
    name: "Test Matter NA004",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const testMatter2: SyntheticMatter = {
    id: "test-matter-na-005",
    matterNumber: "2026-NA005",
    name: "Test Matter NA005",
    client: "Another Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-approval-matter-1",
      matterId: "test-matter-na-004",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval for matter 1.",
      object: "Settlement",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-matter-1",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval for matter 1",
      },
    },
    {
      eventId: "test-approval-matter-2",
      matterId: "test-matter-na-005",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-18T10:00:00Z",
      actor: "Attorney",
      action: "Requested client approval for matter 2.",
      object: "Contract",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-matter-2",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-18T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval for matter 2",
      },
    },
  ];

  const derivedMatter1 = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-004",
    testMatter1,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  const derivedMatter2 = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-005",
    testMatter2,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  // Each matter should only see its own events
  assert.equal(
    derivedMatter1.evidenceIds[0],
    "test-artifact-matter-1",
    "Matter 1 should cite only its own artifact",
  );
  assert.equal(
    derivedMatter2.evidenceIds[0],
    "test-artifact-matter-2",
    "Matter 2 should cite only its own artifact",
  );
  assert.notEqual(
    derivedMatter1.value,
    derivedMatter2.value,
    "Different matters should have different next actions",
  );
});

test("next-action: no events returns UNKNOWN", () => {
  const testMatter: SyntheticMatter = {
    id: "test-matter-na-006",
    matterNumber: "2026-NA006",
    name: "Test Matter NA006",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-006",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN", "State should be UNKNOWN");
  assert.equal(derived.value, "Unknown", "Value should be Unknown");
  assert.equal(derived.evidenceIds.length, 0, "Should have no evidence IDs");
});

test("next-action: approval with court as sender", () => {
  const testMatter: SyntheticMatter = {
    id: "test-matter-na-007",
    matterNumber: "2026-NA007",
    name: "Test Matter NA007",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-doc-from-court",
      matterId: "test-matter-na-007",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Court clerk",
      action: "Sent proposed order.",
      object: "Proposed order",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-court",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "proposed order",
      },
    },
    {
      eventId: "test-approval-court",
      matterId: "test-matter-na-007",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before filing.",
      object: "Order",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-approval-court",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before filing",
      },
    },
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-007",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "INFERRED", "State should be INFERRED");
  assert.ok(
    derived.value.includes("the court"),
    "Value should map the Court clerk role to 'the court'",
  );
  assert.ok(
    !derived.value.includes("court clerk"),
    "Value should not echo the raw Court clerk label",
  );
});

test("next-action: only document-reviewed event (no approval)", () => {
  const testMatter: SyntheticMatter = {
    id: "test-matter-na-008",
    matterNumber: "2026-NA008",
    name: "Test Matter NA008",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-doc-reviewed",
      matterId: "test-matter-na-008",
      eventType: "DOCUMENT_REVIEWED",
      occurredAt: "2026-09-17T10:00:00Z",
      actor: "Attorney",
      action: "Reviewed the contract.",
      object: "Contract",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-reviewed",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "reviewed the contract",
      },
    },
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-008",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "INFERRED", "State should be INFERRED");
  assert.ok(
    derived.value.toLowerCase().includes("respond") ||
      derived.value.toLowerCase().includes("decision"),
    "Value should mention responding or decision",
  );
  assert.equal(
    derived.evidenceIds[0],
    "test-artifact-reviewed",
    "Should cite the document-reviewed artifact",
  );
});

test("next-action: client name mentioned in approval action", () => {
  const testMatter: SyntheticMatter = {
    id: "test-matter-na-009",
    matterNumber: "2026-NA009",
    name: "Test Matter NA009",
    client: "Jordan Smith",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-doc-sent-na009",
      matterId: "test-matter-na-009",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Opposing counsel",
      action: "Sent revised proposal.",
      object: "Proposal",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-doc-na009",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "revised proposal",
      },
    },
    {
      eventId: "test-approval-na009",
      matterId: "test-matter-na-009",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested Jordan Smith's approval before responding.",
      object: "Proposal",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-approval-na009",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "Jordan Smith's approval",
      },
    },
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-009",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "INFERRED", "State should be INFERRED");
  assert.ok(
    derived.value.toLowerCase().includes("client"),
    "Value should mention client when client name is in action",
  );
  assert.ok(
    derived.value.includes("opposing counsel"),
    "Value should identify opposing counsel as recipient (lowercased actor name)",
  );
});

test("next-action: actor 'Courtney Smith' is not treated as court", () => {
  const testMatter: SyntheticMatter = {
    id: "test-matter-na-010",
    matterNumber: "2026-NA010",
    name: "Test Matter NA010",
    client: "Test Client",
    responsibleAttorney: "Test Attorney",
    status: "Active",
    participantIds: [],
  };

  const syntheticEvents: OperationalEvent[] = [
    {
      eventId: "test-doc-courtney",
      matterId: "test-matter-na-010",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Courtney Smith",
      action: "Sent updated contract.",
      object: "Contract",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-courtney",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "updated contract",
      },
    },
    {
      eventId: "test-approval-courtney",
      matterId: "test-matter-na-010",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before filing.",
      object: "Contract",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "test-artifact-approval-courtney",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before filing",
      },
    },
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-010",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "INFERRED", "State should be INFERRED");
  assert.ok(
    derived.value.includes("Courtney Smith"),
    "Value should keep the sender's proper-name casing",
  );
  assert.ok(
    !derived.value.includes("courtney smith"),
    "Value should not lowercase the sender's name",
  );
  assert.ok(
    !derived.value.match(/\bthe court\b/i),
    "Value should not mention 'the court'",
  );
});

function makeNextActionMatter(
  id: string,
  overrides: Partial<SyntheticMatter> = {},
): SyntheticMatter {
  return {
    id,
    matterNumber: id,
    name: `Test ${id}`,
    client: "Jordan Smith",
    responsibleAttorney: "Alex Thompson",
    status: "Active",
    participantIds: [],
    ...overrides,
  };
}

function makeNextActionEvent(
  event: Omit<OperationalEvent, "extractionMethod">,
): OperationalEvent {
  return {
    ...event,
    extractionMethod: "SYNTHETIC_GROUND_TRUTH",
  };
}

const SMITH_STYLE_SENTENCE =
  "Respond to opposing counsel after the client makes a decision.";

const NEXT_ACTION_AS_OF = "2026-09-17T23:59:59Z";

test("next-action: organization name keeps its original casing", () => {
  const testMatter = makeNextActionMatter("test-matter-na-011");
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: "test-doc-acme",
      matterId: "test-matter-na-011",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Acme Corp LLP",
      action: "Sent revised terms.",
      object: "Terms",
      provenance: {
        sourceArtifactId: "test-artifact-acme",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "revised terms",
      },
    }),
    makeNextActionEvent({
      eventId: "test-approval-acme",
      matterId: "test-matter-na-011",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before responding.",
      object: "Terms",
      provenance: {
        sourceArtifactId: "test-artifact-approval-acme",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before responding",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-011",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "INFERRED");
  assert.ok(
    derived.value.includes("Acme Corp LLP"),
    "Value should keep the organization name casing",
  );
  assert.ok(
    !derived.value.includes("acme corp llp"),
    "Value should not lowercase the organization name",
  );
});

test("next-action: client-sent latest document does not say Respond to client", () => {
  const testMatter = makeNextActionMatter("test-matter-na-012");
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: "test-doc-from-client",
      matterId: "test-matter-na-012",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Jordan Smith",
      action: "Sent client comments.",
      object: "Comments",
      provenance: {
        sourceArtifactId: "test-artifact-client-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "client comments",
      },
    }),
    makeNextActionEvent({
      eventId: "test-approval-after-client-doc",
      matterId: "test-matter-na-012",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before filing.",
      object: "Comments",
      provenance: {
        sourceArtifactId: "test-artifact-approval-client-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before filing",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-012",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    !/respond to jordan smith/i.test(derived.value),
    "Must not produce Respond to <client>",
  );
  assert.ok(
    !/respond to (the )?client/i.test(derived.value),
    "Must not produce Respond to the client",
  );
});

test("next-action: own-attorney-sent latest document does not say Respond to our attorney", () => {
  const testMatter = makeNextActionMatter("test-matter-na-013");
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: "test-doc-from-attorney",
      matterId: "test-matter-na-013",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Alex Thompson",
      action: "Sent draft response.",
      object: "Draft response",
      provenance: {
        sourceArtifactId: "test-artifact-own-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "draft response",
      },
    }),
    makeNextActionEvent({
      eventId: "test-approval-after-own-doc",
      matterId: "test-matter-na-013",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before sending.",
      object: "Draft response",
      provenance: {
        sourceArtifactId: "test-artifact-approval-own-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before sending",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-013",
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    !/respond to alex thompson/i.test(derived.value),
    "Must not produce Respond to <our attorney>",
  );
  assert.ok(
    !/respond to (our )?(attorney|firm)/i.test(derived.value),
    "Must not produce Respond to our attorney or firm",
  );
});

function smithStyleApprovalEvents(matterId: string): OperationalEvent[] {
  return [
    makeNextActionEvent({
      eventId: `${matterId}-doc`,
      matterId,
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Opposing counsel",
      action: "Sent revised settlement language.",
      object: "Revised settlement language",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-doc`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "revised settlement language",
      },
    }),
    makeNextActionEvent({
      eventId: `${matterId}-approval`,
      matterId,
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before responding.",
      object: "Settlement language",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-approval`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before responding",
      },
    }),
  ];
}

test("next-action: later Settled status does not drive the Smith-style sentence", () => {
  const matterId = "test-matter-na-stale-settled";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    ...smithStyleApprovalEvents(matterId),
    makeNextActionEvent({
      eventId: `${matterId}-settled`,
      matterId,
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-20T09:00:00Z",
      actor: null,
      action: "Recorded the matter status as Settled.",
      object: "Matter status",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-settled`,
        sourceSystem: "Clio",
        sourceRecordedAt: "2026-09-20T09:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt: "Matter status: Settled",
      },
    }),
  ];

  const derived = deriveNextActionSlot(syntheticEvents, matterId, testMatter, [], syntheticRequestingUser, NEXT_ACTION_AS_OF);
  assert.notEqual(derived.value, SMITH_STYLE_SENTENCE);
  assert.ok(
    !derived.value.includes("Respond to opposing counsel after the client makes a decision"),
    "Settled matter must not keep the Smith-style next action",
  );
});

test("next-action: later Closed status does not drive the Smith-style sentence", () => {
  const matterId = "test-matter-na-stale-closed";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    ...smithStyleApprovalEvents(matterId),
    makeNextActionEvent({
      eventId: `${matterId}-closed`,
      matterId,
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-21T09:00:00Z",
      actor: null,
      action: "Recorded the matter status as Closed.",
      object: "Matter status",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-closed`,
        sourceSystem: "Clio",
        sourceRecordedAt: "2026-09-21T09:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt: "Matter status: Closed",
      },
    }),
  ];

  const derived = deriveNextActionSlot(syntheticEvents, matterId, testMatter, [], syntheticRequestingUser, NEXT_ACTION_AS_OF);
  assert.notEqual(derived.value, SMITH_STYLE_SENTENCE);
  assert.ok(
    !derived.value.includes("Respond to opposing counsel after the client makes a decision"),
    "Closed matter must not keep the Smith-style next action",
  );
});

test("next-action: later client document does not drive the Smith-style sentence", () => {
  const matterId = "test-matter-na-stale-client-doc";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    ...smithStyleApprovalEvents(matterId),
    makeNextActionEvent({
      eventId: `${matterId}-later-client-doc`,
      matterId,
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-22T15:00:00Z",
      actor: "Jordan Smith",
      action: "Sent a follow-up letter.",
      object: "Follow-up letter",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-later-client`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-22T15:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "follow-up letter",
      },
    }),
  ];

  const derived = deriveNextActionSlot(syntheticEvents, matterId, testMatter, [], syntheticRequestingUser, NEXT_ACTION_AS_OF);
  assert.notEqual(derived.value, SMITH_STYLE_SENTENCE);
  assert.ok(
    !derived.value.includes("Respond to opposing counsel after the client makes a decision"),
    "A later client document must stale the pending approval next action",
  );
});

test("next-action: about 6 months of silence does not drive the Smith-style sentence", () => {
  const matterId = "test-matter-na-stale-silence";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    ...smithStyleApprovalEvents(matterId),
    makeNextActionEvent({
      eventId: `${matterId}-later-status`,
      matterId,
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2027-03-17T12:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-later-status`,
        sourceSystem: "Clio",
        sourceRecordedAt: "2027-03-17T12:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt: "Matter status: Active",
      },
    }),
  ];

  const approvalTime = new Date("2026-09-17T12:00:00Z").getTime();
  const staleAsOf = new Date(approvalTime + 180 * 24 * 60 * 60 * 1000).toISOString();
  const derived = deriveNextActionSlot(syntheticEvents, matterId, testMatter, [], syntheticRequestingUser, staleAsOf);
  assert.notEqual(derived.value, SMITH_STYLE_SENTENCE);
  assert.ok(
    !derived.value.includes("Respond to opposing counsel after the client makes a decision"),
    "Six months of silence must stale the pending approval next action",
  );
});

test("next-action and waiting-on agree on who is being waited on", () => {
  const testMatter = makeNextActionMatter("test-matter-na-agree");
  const testEvidence: EligibleEvidenceItem[] = [
    {
      id: "test-artifact-agree-approval",
      sourceSystem: "Outlook",
      artifactType: "Email",
      timestamp: "2026-09-17T12:00:00Z",
      from: "alex.thompson@lawfirm.example",
      to: ["jordan.smith@example.com"],
      subject: "Approval needed",
      content: "Please approve before I respond.",
      participants: ["person-jordan-smith"],
      authorizedUserIds: ["user-test"],
      association: {
        evidenceId: "test-artifact-agree-approval",
        status: "ASSOCIATED",
        method: "EXPLICIT_MATTER_ID",
        reason: "test",
      },
      provenance: {
        source: "Outlook",
        originalArtifactId: "test-artifact-agree-approval",
        associationMethod: "EXPLICIT_MATTER_ID",
        retrieved: "synthetic request execution",
      },
    },
  ];
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: "test-doc-agree",
      matterId: "test-matter-na-agree",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Opposing counsel",
      action: "Sent revised language.",
      object: "Revised language",
      provenance: {
        sourceArtifactId: "test-artifact-agree-doc",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "revised language",
      },
    }),
    makeNextActionEvent({
      eventId: "test-approval-agree",
      matterId: "test-matter-na-agree",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested approval before responding to opposing counsel.",
      object: "Revised language",
      provenance: {
        sourceArtifactId: "test-artifact-agree-approval",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before responding",
      },
    }),
  ];

  const waiting = deriveWaitingOnSlot(
    syntheticEvents,
    "test-matter-na-agree",
    testMatter,
    testEvidence,
  );
  const next = deriveNextActionSlot(
    syntheticEvents,
    "test-matter-na-agree",
    testMatter,
    testEvidence,
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(waiting.value, "Client approval");
  assert.ok(
    next.value.includes("the client makes a decision"),
    "Next Action must wait on the same client as Waiting On",
  );
  assert.ok(
    !next.value.includes("attorney approval"),
    "Next Action must not disagree by waiting on attorney approval",
  );
});

function makeEmailEvidence(args: {
  id: string;
  from: string;
  to: string[];
  timestamp?: string;
}): EligibleEvidenceItem {
  return {
    id: args.id,
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: args.timestamp ?? "2026-09-17T12:00:00Z",
    from: args.from,
    to: args.to,
    subject: "Test",
    content: "Test",
    participants: [],
    authorizedUserIds: ["user-rachel-morgan"],
    association: {
      evidenceId: args.id,
      status: "ASSOCIATED",
      method: "EXPLICIT_MATTER_ID",
      reason: "test",
    },
    provenance: {
      source: "Outlook",
      originalArtifactId: args.id,
      associationMethod: "EXPLICIT_MATTER_ID",
      retrieved: "synthetic request execution",
    },
  };
}

test("next-action: requesting-user sender is our side, not a respond-to target", () => {
  const matterId = "test-matter-na-own-requesting-user";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: `${matterId}-doc`,
      matterId,
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Rachel Morgan",
      action: "Sent an internal draft.",
      object: "Internal draft",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-doc`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "internal draft",
      },
    }),
    makeNextActionEvent({
      eventId: `${matterId}-approval`,
      matterId,
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before sending.",
      object: "Internal draft",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-approval`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before sending",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    !/respond to rachel morgan/i.test(derived.value),
    "Must not produce Respond to the requesting user",
  );
});

test("next-action: Firm paralegal sender is our side, not a respond-to target", () => {
  const matterId = "test-matter-na-own-paralegal";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: `${matterId}-doc`,
      matterId,
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Firm paralegal",
      action: "Sent the compiled exhibits.",
      object: "Exhibits",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-doc`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "compiled exhibits",
      },
    }),
    makeNextActionEvent({
      eventId: `${matterId}-approval`,
      matterId,
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before filing.",
      object: "Exhibits",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-approval`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before filing",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    !/respond to firm paralegal/i.test(derived.value),
    "Must not produce Respond to a firm staff role",
  );
});

test("next-action: firm-domain sender is our side even when the actor name is unknown", () => {
  const matterId = "test-matter-na-own-firm-domain";
  const testMatter = makeNextActionMatter(matterId);
  const docArtifactId = `${matterId}-artifact-doc`;
  const approvalArtifactId = `${matterId}-artifact-approval`;
  const testEvidence: EligibleEvidenceItem[] = [
    makeEmailEvidence({
      id: docArtifactId,
      from: "jamie.chen@lawfirm.example",
      to: ["jordan.smith@example.com"],
      timestamp: "2026-09-16T10:00:00Z",
    }),
    makeEmailEvidence({
      id: approvalArtifactId,
      from: "alex.thompson@lawfirm.example",
      to: ["jordan.smith@example.com"],
      timestamp: "2026-09-17T12:00:00Z",
    }),
  ];
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: `${matterId}-doc`,
      matterId,
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Jamie Chen",
      action: "Sent the draft letter.",
      object: "Draft letter",
      provenance: {
        sourceArtifactId: docArtifactId,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "draft letter",
      },
    }),
    makeNextActionEvent({
      eventId: `${matterId}-approval`,
      matterId,
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before sending.",
      object: "Draft letter",
      provenance: {
        sourceArtifactId: approvalArtifactId,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before sending",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    testEvidence,
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    !/respond to jamie chen/i.test(derived.value),
    "Firm-domain senders must be treated as our side; this assertion is load-bearing for isDocumentFromClientOrOwnSide",
  );
});

test("next-action: object text keeps original proper-noun casing", () => {
  const waitingMatter = makeNextActionMatter("test-matter-na-object-waiting");
  const waitingDerived = deriveNextActionSlot(
    [
      makeNextActionEvent({
        eventId: "test-waiting-judge-lee",
        matterId: "test-matter-na-object-waiting",
        eventType: "WAITING_STATE_REPORTED",
        occurredAt: "2026-09-15T10:00:00Z",
        actor: "Attorney",
        action: "Reported waiting for Judge Lee's ruling.",
        object: "Judge Lee's ruling",
        provenance: {
          sourceArtifactId: "test-artifact-object-waiting",
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-15T10:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "waiting for Judge Lee's ruling",
        },
      }),
    ],
    "test-matter-na-object-waiting",
    waitingMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    waitingDerived.value.includes("Judge Lee's ruling"),
    "Waiting-state object must keep proper-noun casing",
  );
  assert.ok(
    !waitingDerived.value.includes("judge lee's ruling"),
    "Waiting-state object must not be lowercased",
  );

  const approvalMatter = makeNextActionMatter("test-matter-na-object-approval");
  const approvalDerived = deriveNextActionSlot(
    [
      makeNextActionEvent({
        eventId: "test-doc-object-acme",
        matterId: "test-matter-na-object-approval",
        eventType: "DOCUMENT_SENT",
        occurredAt: "2026-09-16T10:00:00Z",
        actor: "Jordan Smith",
        action: "Sent comments on Acme Corp.",
        object: "Acme Corp",
        provenance: {
          sourceArtifactId: "test-artifact-object-doc",
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-16T10:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "Acme Corp",
        },
      }),
      makeNextActionEvent({
        eventId: "test-approval-object-acme",
        matterId: "test-matter-na-object-approval",
        eventType: "APPROVAL_REQUESTED",
        occurredAt: "2026-09-17T12:00:00Z",
        actor: "Attorney",
        action: "Requested client approval of Acme Corp.",
        object: "Acme Corp",
        provenance: {
          sourceArtifactId: "test-artifact-object-approval",
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-17T12:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "approval of Acme Corp",
        },
      }),
    ],
    "test-matter-na-object-approval",
    approvalMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    approvalDerived.value.includes("Acme Corp"),
    "Approval object must keep proper-noun casing",
  );
  assert.ok(
    !approvalDerived.value.includes("acme corp"),
    "Approval object must not be lowercased",
  );
});

const DAY_MS = 24 * 60 * 60 * 1000;

test("next-action: approval is stale after 180 days with no later events", () => {
  const matterId = "test-matter-na-silence-no-later-events";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents = smithStyleApprovalEvents(matterId);
  const approvalTime = new Date("2026-09-17T12:00:00Z").getTime();
  const asOf = new Date(approvalTime + 180 * DAY_MS).toISOString();

  const derived = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    [],
    syntheticRequestingUser,
    asOf,
  );

  assert.notEqual(derived.value, SMITH_STYLE_SENTENCE);
  assert.ok(
    !derived.value.includes("Respond to opposing counsel after the client makes a decision"),
    "Silence is measured against asOf, not a later inserted event",
  );
});

test("next-action: silence boundary is 180 days inclusive", () => {
  const matterId = "test-matter-na-silence-boundary";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents = smithStyleApprovalEvents(matterId);
  const approvalTime = new Date("2026-09-17T12:00:00Z").getTime();
  const asOf179 = new Date(approvalTime + 179 * DAY_MS).toISOString();
  const asOf180 = new Date(approvalTime + 180 * DAY_MS).toISOString();

  const at179 = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    [],
    syntheticRequestingUser,
    asOf179,
  );
  const at180 = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    [],
    syntheticRequestingUser,
    asOf180,
  );

  assert.equal(
    at179.value,
    SMITH_STYLE_SENTENCE,
    "179 days of silence must not stale the approval (so >= vs > is load-bearing)",
  );
  assert.notEqual(
    at180.value,
    SMITH_STYLE_SENTENCE,
    "180 days of silence must stale the approval",
  );
});

test("next-action: later opposing-counsel document then Settled is UNKNOWN", () => {
  const matterId = "test-matter-na-oc-doc-then-settled";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    ...smithStyleApprovalEvents(matterId),
    makeNextActionEvent({
      eventId: `${matterId}-later-oc-doc`,
      matterId,
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-20T10:00:00Z",
      actor: "Opposing counsel",
      action: "Sent a further revision.",
      object: "Further revision",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-later-oc`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-20T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "further revision",
      },
    }),
    makeNextActionEvent({
      eventId: `${matterId}-settled`,
      matterId,
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-21T09:00:00Z",
      actor: null,
      action: "Recorded the matter status as Settled.",
      object: "Matter status",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-settled`,
        sourceSystem: "Clio",
        sourceRecordedAt: "2026-09-21T09:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt: "Matter status: Settled",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Review the document and respond.");
});

test("next-action: ground truth is unchanged at its asOf", () => {
  const derived = deriveNextActionSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
    evidenceProcessing.eligibleEvidence,
    syntheticRequestingUser,
    syntheticCurrentStateGroundTruth.asOf,
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "next-action",
  );

  assert.ok(expectation);
  assert.equal(derived.value, expectation.expectedValue);
  assert.equal(derived.state, expectation.expectedState);
});

test("next-action: invalid or missing asOf is UNKNOWN, not never-stale", () => {
  const matterId = "test-matter-na-invalid-asof";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents = smithStyleApprovalEvents(matterId);

  for (const asOf of ["", "   ", "not-a-date"]) {
    const derived = deriveNextActionSlot(
      syntheticEvents,
      matterId,
      testMatter,
      [],
      syntheticRequestingUser,
      asOf,
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `Invalid asOf ${JSON.stringify(asOf)} must be explicit UNKNOWN`,
    );
    assert.notEqual(
      derived.value,
      SMITH_STYLE_SENTENCE,
      `Invalid asOf ${JSON.stringify(asOf)} must not silently mean never stale`,
    );
  }
});

test("next-action: webmail domain must not make opposing counsel look like our side", () => {
  const matterId = "test-matter-na-webmail-domain";
  const testMatter = makeNextActionMatter(matterId);
  const docArtifactId = `${matterId}-artifact-doc`;
  const approvalArtifactId = `${matterId}-artifact-approval`;
  const testEvidence: EligibleEvidenceItem[] = [
    makeEmailEvidence({
      id: docArtifactId,
      from: "pat.lee@gmail.com",
      to: ["jordan.smith@example.com"],
      timestamp: "2026-09-16T10:00:00Z",
    }),
    makeEmailEvidence({
      id: approvalArtifactId,
      from: "alex.thompson@gmail.com",
      to: ["jordan.smith@example.com"],
      timestamp: "2026-09-17T12:00:00Z",
    }),
  ];
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: `${matterId}-doc`,
      matterId,
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Opposing counsel",
      action: "Sent revised terms.",
      object: "Revised terms",
      provenance: {
        sourceArtifactId: docArtifactId,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "revised terms",
      },
    }),
    makeNextActionEvent({
      eventId: `${matterId}-approval`,
      matterId,
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before responding.",
      object: "Revised terms",
      provenance: {
        sourceArtifactId: approvalArtifactId,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before responding",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    testEvidence,
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    derived.value.includes("opposing counsel"),
    "gmail.com shared with our attorney must not reclassify opposing counsel as our side",
  );
  assert.ok(
    !/proceed with/i.test(derived.value),
    "Opposing counsel on gmail.com must remain a respond-to target",
  );
});

test("next-action: bare Paralegal role label is our side, not a respond-to target", () => {
  const matterId = "test-matter-na-own-bare-paralegal";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    makeNextActionEvent({
      eventId: `${matterId}-doc`,
      matterId,
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T10:00:00Z",
      actor: "Paralegal",
      action: "Sent the compiled exhibits.",
      object: "Exhibits",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-doc`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T10:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "compiled exhibits",
      },
    }),
    makeNextActionEvent({
      eventId: `${matterId}-approval`,
      matterId,
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Attorney",
      action: "Requested client approval before filing.",
      object: "Exhibits",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-approval`,
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt: "approval before filing",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.ok(
    !/respond to paralegal/i.test(derived.value),
    "Must not produce Respond to Paralegal",
  );
});

test("next-action: Active (not settled) does not match the settled/closed regex", () => {
  const matterId = "test-matter-na-not-settled";
  const testMatter = makeNextActionMatter(matterId);
  const syntheticEvents: OperationalEvent[] = [
    ...smithStyleApprovalEvents(matterId),
    makeNextActionEvent({
      eventId: `${matterId}-active-not-settled`,
      matterId,
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-20T09:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active (not settled).",
      object: "Matter status",
      provenance: {
        sourceArtifactId: `${matterId}-artifact-active`,
        sourceSystem: "Clio",
        sourceRecordedAt: "2026-09-20T09:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt: "Matter status: Active (not settled)",
      },
    }),
  ];

  const derived = deriveNextActionSlot(
    syntheticEvents,
    matterId,
    testMatter,
    [],
    syntheticRequestingUser,
    NEXT_ACTION_AS_OF,
  );

  assert.equal(
    derived.value,
    SMITH_STYLE_SENTENCE,
    "Active (not settled) must not be treated as Settled or Closed",
  );
});

// ============================================================================
// OWNER SLOT TESTS
// ============================================================================

function makeOwnerEvent(
  event: Omit<OperationalEvent, "extractionMethod">,
): OperationalEvent {
  return {
    ...event,
    extractionMethod: "SYNTHETIC_GROUND_TRUTH",
  };
}

function makeOwnerMatter(
  id: string,
  overrides: Partial<SyntheticMatter> = {},
): SyntheticMatter {
  return {
    id,
    matterNumber: id,
    name: `Test ${id}`,
    client: "Jordan Smith",
    responsibleAttorney: "Alex Thompson",
    status: "Active",
    participantIds: [],
    ...overrides,
  };
}

const OWNER_AS_OF = "2026-09-17T23:59:59Z";

test("derived owner slot matches ground-truth expectation", () => {
  const derived = deriveOwnerSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
    evidenceProcessing.eligibleEvidence,
    syntheticRequestingUser,
    syntheticCurrentStateGroundTruth.asOf,
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "owner",
  );

  assert.ok(expectation, "Ground truth has owner expectation");
  assert.equal(derived.id, "owner", "Derived slot has correct ID");
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

test("owner: no responsibility events returns UNKNOWN", () => {
  const matterId = "test-matter-owner-none";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-doc`,
        matterId,
        eventType: "DOCUMENT_SENT",
        occurredAt: "2026-09-16T10:00:00Z",
        actor: "Opposing counsel",
        action: "Sent a letter.",
        object: "Letter",
        provenance: {
          sourceArtifactId: `${matterId}-artifact-doc`,
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-16T10:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "letter",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.equal(derived.evidenceIds.length, 0);
});

test("owner: structured actor name is SUPPORTED", () => {
  const matterId = "test-matter-owner-actor";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: "Alex Thompson",
        action: "Assigned coverage for the file.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-resp`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "assigned coverage",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Alex Thompson");
  assert.deepEqual(derived.evidenceIds, [`${matterId}-artifact-resp`]);
});

test("owner: attorney role label without a named person is UNKNOWN", () => {
  const matterId = "test-matter-owner-role";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: null,
        action: "Updated the assignment on the matter record.",
        object: "Responsible attorney",
        provenance: {
          sourceArtifactId: `${matterId}-artifact-resp`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "assignment updated",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId, { responsibleAttorney: "Priya Nair" }),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("owner: text fallback matching a known identity is INFERRED", () => {
  const matterId = "test-matter-owner-text";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: null,
        action: "Noted that Priya Nair will handle follow-up on this file.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-resp`,
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "will handle follow-up",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId, { responsibleAttorney: "Priya Nair" }),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "Priya Nair");
});

test("owner: unknown name in text without structured identity is UNKNOWN", () => {
  const matterId = "test-matter-owner-unknown-text";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: null,
        action: "Noted that someone on the team will handle follow-up.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-resp`,
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "someone on the team",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId, { responsibleAttorney: "Priya Nair" }),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.equal(derived.evidenceIds.length, 0);
});

test("owner: structured data wins over a different name in action text", () => {
  const matterId = "test-matter-owner-structured-wins";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: "Priya Nair",
        action: "Noted that Rachel Morgan will help with coverage.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-resp`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "coverage note",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId, { responsibleAttorney: "Priya Nair" }),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Priya Nair");
});

test("owner: later responsibility event supersedes an earlier one", () => {
  const matterId = "test-matter-owner-supersede";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-earlier`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-08-01T09:00:00Z",
        actor: "Alex Thompson",
        action: "Opened the file.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-earlier`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-08-01T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "opened the file",
        },
      }),
      makeOwnerEvent({
        eventId: `${matterId}-later`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-10T09:00:00Z",
        actor: "Priya Nair",
        action: "Took over coverage.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-later`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-10T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "took over coverage",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId, { responsibleAttorney: "Priya Nair" }),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Priya Nair");
  assert.deepEqual(derived.evidenceIds, [`${matterId}-artifact-later`]);
});

test("owner: events after asOf are ignored", () => {
  const matterId = "test-matter-owner-asof";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-before`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-10T09:00:00Z",
        actor: "Rachel Morgan",
        action: "Opened the file.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-before`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-10T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "opened the file",
        },
      }),
      makeOwnerEvent({
        eventId: `${matterId}-after`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-20T09:00:00Z",
        actor: "Priya Nair",
        action: "Took over coverage.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-after`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-20T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "took over coverage",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId, { responsibleAttorney: "Priya Nair" }),
    [],
    syntheticRequestingUser,
    "2026-09-17T23:59:59Z",
  );

  assert.equal(derived.value, "Rachel Morgan");
  assert.deepEqual(derived.evidenceIds, [`${matterId}-artifact-before`]);
});

test("owner: client actor is not treated as the matter owner", () => {
  const matterId = "test-matter-owner-client";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: "Jordan Smith",
        action: "Client confirmed they will review the draft.",
        object: null,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-resp`,
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "will review the draft",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("owner: matter isolation ignores another matter's assignment", () => {
  const matterId = "test-matter-owner-isolation";
  const otherMatterId = "test-matter-owner-other";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${otherMatterId}-resp`,
        matterId: otherMatterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: "Alex Thompson",
        action: "Took over the other file.",
        object: null,
        provenance: {
          sourceArtifactId: `${otherMatterId}-artifact-resp`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "took over",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.equal(derived.evidenceIds.length, 0);
});

test("owner: invalid asOf is UNKNOWN", () => {
  const matterId = "test-matter-owner-invalid-asof";
  const events = [
    makeOwnerEvent({
      eventId: `${matterId}-resp`,
      matterId,
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-09-12T09:00:00Z",
      actor: "Alex Thompson",
      action: "Opened the file.",
      object: null,
      provenance: {
        sourceArtifactId: `${matterId}-artifact-resp`,
        sourceSystem: "Clio",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt: "opened the file",
      },
    }),
  ];
  const derived = deriveOwnerSlot(
    events,
    matterId,
    makeOwnerMatter(matterId),
    [],
    syntheticRequestingUser,
    "not-a-date",
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("owner: mutation removing responsibility events breaks the ground-truth match", () => {
  const withoutResponsibility = extractedEvents.filter(
    (event) => event.eventType !== "RESPONSIBILITY_RECORDED",
  );
  const derived = deriveOwnerSlot(
    withoutResponsibility,
    syntheticMatters[0].id,
    syntheticMatters[0],
    evidenceProcessing.eligibleEvidence,
    syntheticRequestingUser,
    syntheticCurrentStateGroundTruth.asOf,
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "owner",
  );

  assert.ok(expectation);
  assert.notEqual(derived.value, expectation.expectedValue);
  assert.equal(derived.state, "UNKNOWN");
});

test("owner: email from a known own-side person is structured SUPPORTED", () => {
  const matterId = "test-matter-owner-email";
  const artifactId = `${matterId}-artifact-resp`;
  const testEvidence: EligibleEvidenceItem[] = [
    makeEmailEvidence({
      id: artifactId,
      from: "priya.nair@lawfirm.example",
      to: ["jordan.smith@example.com"],
      timestamp: "2026-09-12T09:00:00Z",
    }),
  ];
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: null,
        action: "Logged a coverage note on the file.",
        object: null,
        provenance: {
          sourceArtifactId: artifactId,
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "coverage note",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId, { responsibleAttorney: "Priya Nair" }),
    testEvidence,
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Priya Nair");
});

test("owner: role label does not stand in for a person named only in the event", () => {
  const matterId = "test-matter-owner-role-not-proxy";
  const derived = deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: null,
        action: "Recorded Jamie Lee as the responsible attorney.",
        object: "Responsible attorney",
        provenance: {
          sourceArtifactId: `${matterId}-artifact-resp`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "responsible attorney",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId, { responsibleAttorney: "Alex Thompson" }),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );

  assert.notEqual(derived.value, "Alex Thompson");
  assert.notEqual(derived.state, "SUPPORTED");
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("owner: unrecognized actor or object labels are UNKNOWN", () => {
  const labels = [
    "Dana Price",
    "Judge Lee",
    "Jordan Smithson",
    "Al Thompson",
    "Alex",
    "Discovery responses",
    "Matter",
  ];
  const matterId = "test-matter-owner-unrecognized-labels";
  const testMatter = makeOwnerMatter(matterId, {
    responsibleAttorney: "Alex Thompson",
  });

  for (const label of labels) {
    for (const field of ["actor", "object"] as const) {
      const derived = deriveOwnerSlot(
        [
          makeOwnerEvent({
            eventId: `${matterId}-${field}-${label}`,
            matterId,
            eventType: "RESPONSIBILITY_RECORDED",
            occurredAt: "2026-09-12T09:00:00Z",
            actor: field === "actor" ? label : null,
            action: "Updated the assignment on the matter record.",
            object: field === "object" ? label : null,
            provenance: {
              sourceArtifactId: `${matterId}-artifact-${field}`,
              sourceSystem: "Clio",
              sourceRecordedAt: "2026-09-12T09:00:00Z",
              associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
              evidenceExcerpt: "assignment updated",
            },
          }),
        ],
        matterId,
        testMatter,
        [],
        syntheticRequestingUser,
        OWNER_AS_OF,
      );

      assert.equal(
        derived.state,
        "UNKNOWN",
        `${JSON.stringify(label)} as ${field} must be UNKNOWN, got ${derived.state} / ${derived.value}`,
      );
      assert.equal(
        derived.value,
        "Unknown",
        `${JSON.stringify(label)} as ${field} must not become a SUPPORTED owner`,
      );
    }
  }
});

test("owner: replacing/from/to text does not keep the outgoing owner", () => {
  const matterId = "test-matter-owner-transfer-text";
  const testMatter = makeOwnerMatter(matterId, {
    responsibleAttorney: "Alex Thompson",
  });
  const sentences = [
    "Recorded Jamie Lee as the responsible attorney, replacing Alex Thompson.",
    "Transferred from Alex Thompson to Jamie Lee.",
  ];

  for (const action of sentences) {
    const derived = deriveOwnerSlot(
      [
        makeOwnerEvent({
          eventId: `${matterId}-${action.length}`,
          matterId,
          eventType: "RESPONSIBILITY_RECORDED",
          occurredAt: "2026-09-12T09:00:00Z",
          actor: null,
          action,
          object: null,
          provenance: {
            sourceArtifactId: `${matterId}-artifact-text`,
            sourceSystem: "Outlook",
            sourceRecordedAt: "2026-09-12T09:00:00Z",
            associationMethod: "EXPLICIT_MATTER_ID",
            evidenceExcerpt: "coverage change",
          },
        }),
      ],
      matterId,
      testMatter,
      [],
      syntheticRequestingUser,
      OWNER_AS_OF,
    );

    assert.notEqual(
      derived.value,
      "Alex Thompson",
      `${JSON.stringify(action)} must not keep the outgoing owner`,
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} is ambiguous when the incoming owner is not a known firm-side identity`,
    );
    assert.equal(derived.value, "Unknown");
  }
});

function deriveOwnerFromAction(
  matterId: string,
  action: string,
  object: string | null = null,
): ReturnType<typeof deriveOwnerSlot> {
  return deriveOwnerSlot(
    [
      makeOwnerEvent({
        eventId: `${matterId}-resp`,
        matterId,
        eventType: "RESPONSIBILITY_RECORDED",
        occurredAt: "2026-09-12T09:00:00Z",
        actor: null,
        action,
        object,
        provenance: {
          sourceArtifactId: `${matterId}-artifact-resp`,
          sourceSystem: "Clio",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
          evidenceExcerpt: "assignment",
        },
      }),
    ],
    matterId,
    makeOwnerMatter(matterId),
    [],
    syntheticRequestingUser,
    OWNER_AS_OF,
  );
}

test("owner: passive replaced-by yields the incoming owner", () => {
  const knownIncoming = deriveOwnerFromAction(
    "test-matter-owner-passive-known",
    "Alex Thompson was replaced by Rachel Morgan.",
    "Responsible attorney",
  );
  assert.equal(knownIncoming.value, "Rachel Morgan");
  assert.notEqual(knownIncoming.value, "Alex Thompson");

  const unknownIncoming = deriveOwnerFromAction(
    "test-matter-owner-passive-unknown",
    "Alex Thompson was replaced by Jamie Lee.",
    "Responsible attorney",
  );
  assert.equal(unknownIncoming.state, "UNKNOWN");
  assert.equal(unknownIncoming.value, "Unknown");
  assert.notEqual(unknownIncoming.value, "Alex Thompson");
});

test("owner: bare from with no incoming owner is UNKNOWN", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-bare-from",
    "Reassigned from Alex Thompson.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
});

test("owner: removed with no incoming owner is UNKNOWN", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-removed",
    "Removed Alex Thompson as responsible attorney.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
});

test("owner: former with no incoming owner is UNKNOWN", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-former",
    "Recorded Alex Thompson as the former responsible attorney.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
});

test("owner: first mentioned known name does not win a transfer", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-first-name-wins",
    "Transferred from Alex Thompson to Rachel Morgan.",
    "Responsible attorney",
  );
  assert.equal(derived.value, "Rachel Morgan");
  assert.notEqual(
    derived.value,
    "Alex Thompson",
    "Outgoing name appears first; returning it means first-mentioned wins",
  );
});

test("owner: departure wording without a positive assignment is UNKNOWN", () => {
  const phrasings = [
    "Alex Thompson is no longer the responsible attorney.",
    "Alex Thompson stepped down as responsible attorney.",
    "Alex Thompson withdrew as counsel.",
    "Alex Thompson left the firm.",
    "Alex Thompson is the outgoing responsible attorney.",
    "Prior responsible attorney: Alex Thompson.",
    "Ex-attorney Alex Thompson.",
  ];

  for (const action of phrasings) {
    const derived = deriveOwnerFromAction(
      `test-matter-owner-departure-${action.length}`,
      action,
      "Responsible attorney",
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must not treat a departure as an assignment`,
    );
    assert.equal(derived.value, "Unknown");
    assert.notEqual(derived.value, "Alex Thompson");
  }
});

test("owner: lone name with no assignment verb is UNKNOWN", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-lone-name",
    "Discussed the file with Alex Thompson.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
});

test("owner: originally assigned name is not the current owner", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-originally-assigned",
    "Originally assigned to Alex Thompson.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
});

test("owner: previously assigned then unassigned is UNKNOWN", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-previously-unassigned",
    "Previously assigned to Alex Thompson; now unassigned.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
});

test("owner: took over then withdrew is UNKNOWN", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-took-over-withdrew",
    "Alex Thompson took over, then withdrew.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
});

test("owner: reversed assignment still yields a named incoming owner", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-reversed-incoming",
    "Originally assigned to Alex Thompson; now assigned to Rachel Morgan.",
    "Responsible attorney",
  );
  assert.equal(derived.value, "Rachel Morgan");
  assert.notEqual(derived.value, "Alex Thompson");
  assert.notEqual(derived.state, "UNKNOWN");
});

test("owner: exactly one assigned name is required", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-two-assigned-names",
    "Assigned to Alex Thompson and Rachel Morgan will handle the file.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
  assert.notEqual(derived.value, "Rachel Morgan");
});

// ============================================================================
// IMPORTANT-DATE SLOT TESTS
// ============================================================================

function makeImportantDateEvent(
  event: Omit<OperationalEvent, "extractionMethod">,
): OperationalEvent {
  return {
    ...event,
    extractionMethod: "SYNTHETIC_GROUND_TRUTH",
  };
}

function scheduleStatusEvent(args: {
  matterId: string;
  eventId: string;
  occurredAt: string | null;
  sourceRecordedAt: string;
  action: string;
  object: string | null;
  artifactId?: string;
}): OperationalEvent {
  return makeImportantDateEvent({
    eventId: args.eventId,
    matterId: args.matterId,
    eventType: "SCHEDULE_STATUS_REPORTED",
    occurredAt: args.occurredAt,
    actor: "Rachel Morgan",
    action: args.action,
    object: args.object,
    provenance: {
      sourceArtifactId: args.artifactId ?? `${args.matterId}-artifact-schedule`,
      sourceSystem: "Outlook",
      sourceRecordedAt: args.sourceRecordedAt,
      associationMethod: "EXPLICIT_MATTER_ID",
      evidenceExcerpt: "schedule",
    },
  });
}

const IMPORTANT_DATE_AS_OF = "2026-09-17T23:59:59Z";

test("derived important-date slot matches ground-truth expectation", () => {
  const derived = deriveImportantDateSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticCurrentStateGroundTruth.asOf,
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "important-date",
  );

  assert.ok(expectation, "Ground truth has important-date expectation");
  assert.equal(derived.id, "important-date", "Derived slot has correct ID");
  assert.equal(
    derived.state,
    expectation.expectedState,
    "Derived state matches ground truth",
  );

  // Ground truth stores null for UNKNOWN; the claim displays the fixed Unknown text.
  const expectedClaimValue =
    expectation.expectedState === "UNKNOWN" && expectation.expectedValue === null
      ? "Unknown"
      : expectation.expectedValue;
  assert.equal(
    derived.value,
    expectedClaimValue,
    "Derived value matches ground truth display mapping",
  );
  assert.equal(
    expectation.expectedValue,
    null,
    "Fixture data value remains null; UNKNOWN is not a hard-coded date",
  );
  assert.deepEqual(derived.evidenceIds, []);
});

test("important-date: fixture UNKNOWN is from missing calendar date, not event time", () => {
  const schedule = extractedEvents.find(
    (event) => event.eventType === "SCHEDULE_STATUS_REPORTED",
  );
  assert.ok(schedule, "Smith fixture includes a schedule event");

  const derived = deriveImportantDateSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticCurrentStateGroundTruth.asOf,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(
    derived.value,
    "September 10, 2026",
    "sourceRecordedAt is not the important date",
  );
  assert.notEqual(
    derived.state,
    "SUPPORTED",
    "Relative phrasing must not become a SUPPORTED date",
  );
});

test("important-date: adding an explicit structured date changes the fixture result", () => {
  const derived = deriveImportantDateSlot(
    [
      ...extractedEvents,
      scheduleStatusEvent({
        matterId: syntheticMatters[0].id,
        eventId: "email-0142-scheduling:explicit-date",
        occurredAt: "2026-09-17T12:00:00Z",
        sourceRecordedAt: "2026-09-17T12:00:00Z",
        action: "Recorded the hearing date on the matter calendar.",
        object: "2026-10-15",
        artifactId: "email-0142-explicit-date",
      }),
    ],
    syntheticMatters[0].id,
    syntheticCurrentStateGroundTruth.asOf,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "October 15, 2026");
  assert.deepEqual(derived.evidenceIds, ["email-0142-explicit-date"]);
});

test("important-date: no schedule events returns UNKNOWN", () => {
  const matterId = "test-matter-date-none";
  const derived = deriveImportantDateSlot(
    [
      makeImportantDateEvent({
        eventId: `${matterId}-doc`,
        matterId,
        eventType: "DOCUMENT_SENT",
        occurredAt: "2026-09-16T10:00:00Z",
        actor: "Opposing counsel",
        action: "Sent a letter dated October 15, 2026.",
        object: "Letter",
        provenance: {
          sourceArtifactId: `${matterId}-artifact-doc`,
          sourceSystem: "Outlook",
          sourceRecordedAt: "2026-09-16T10:00:00Z",
          associationMethod: "EXPLICIT_MATTER_ID",
          evidenceExcerpt: "letter",
        },
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.equal(derived.evidenceIds.length, 0);
});

test("important-date: structured object date is SUPPORTED", () => {
  const matterId = "test-matter-date-structured";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Recorded the conference date.",
        object: "2026-10-15",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "October 15, 2026");
  assert.deepEqual(derived.evidenceIds, [`${matterId}-artifact-schedule`]);
});

test("important-date: text calendar date is INFERRED", () => {
  const matterId = "test-matter-date-text";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Conference scheduled for October 15, 2026.",
        object: "Settlement conference",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "October 15, 2026");
});

test("important-date: relative phrasing without a calendar date is UNKNOWN", () => {
  const matterId = "test-matter-date-relative";
  const phrasings = [
    "Reported that the conference remains scheduled for next week.",
    "Reported that the hearing is due in two weeks.",
    "Reported that the conference is tomorrow.",
    "Reported that the settlement conference remained scheduled for next month.",
  ];

  for (const action of phrasings) {
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-${action.length}`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );

    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must not invent a calendar date`,
    );
    assert.equal(derived.value, "Unknown");
    assert.equal(derived.evidenceIds.length, 0);
  }
});

test("important-date: date before asOf is no longer current", () => {
  const matterId = "test-matter-date-passed";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-08-01T09:00:00Z",
        sourceRecordedAt: "2026-08-01T09:00:00Z",
        action: "Recorded the response date.",
        object: "2026-09-10",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "September 10, 2026");
});

test("important-date: date on asOf day remains current", () => {
  const matterId = "test-matter-date-same-day";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-10T09:00:00Z",
        sourceRecordedAt: "2026-09-10T09:00:00Z",
        action: "Recorded the filing date.",
        object: "2026-09-17",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "September 17, 2026");
});

test("important-date: later schedule event supersedes an earlier date", () => {
  const matterId = "test-matter-date-supersede";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-earlier`,
        occurredAt: "2026-08-01T09:00:00Z",
        sourceRecordedAt: "2026-08-01T09:00:00Z",
        action: "Recorded the original hearing date.",
        object: "2026-10-01",
        artifactId: `${matterId}-artifact-earlier`,
      }),
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-later`,
        occurredAt: "2026-09-10T09:00:00Z",
        sourceRecordedAt: "2026-09-10T09:00:00Z",
        action: "Recorded the continued hearing date.",
        object: "2026-10-15",
        artifactId: `${matterId}-artifact-later`,
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "October 15, 2026");
  assert.deepEqual(derived.evidenceIds, [`${matterId}-artifact-later`]);
});

test("important-date: continuance in one event keeps the destination date", () => {
  const matterId = "test-matter-date-continuance";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Hearing continued from October 1, 2026 to October 15, 2026.",
        object: "Hearing",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "October 15, 2026");
  assert.notEqual(derived.value, "October 1, 2026");
});

test("important-date: two undirected dates are UNKNOWN", () => {
  const matterId = "test-matter-date-ambiguous";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action:
          "Mentioned October 1, 2026 and October 15, 2026 without saying which applies.",
        object: "Hearing",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("important-date: later relative phrasing supersedes an earlier explicit date", () => {
  const matterId = "test-matter-date-relative-supersede";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-earlier`,
        occurredAt: "2026-08-01T09:00:00Z",
        sourceRecordedAt: "2026-08-01T09:00:00Z",
        action: "Recorded the hearing date.",
        object: "2026-10-01",
        artifactId: `${matterId}-artifact-earlier`,
      }),
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-later`,
        occurredAt: "2026-09-10T09:00:00Z",
        sourceRecordedAt: "2026-09-10T09:00:00Z",
        action: "Reported that the hearing was moved to next month.",
        object: "Hearing",
        artifactId: `${matterId}-artifact-later`,
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "October 1, 2026");
});

test("important-date: events after asOf are ignored", () => {
  const matterId = "test-matter-date-asof";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-before`,
        occurredAt: "2026-09-10T09:00:00Z",
        sourceRecordedAt: "2026-09-10T09:00:00Z",
        action: "Recorded the hearing date.",
        object: "2026-10-01",
        artifactId: `${matterId}-artifact-before`,
      }),
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-after`,
        occurredAt: "2026-09-20T09:00:00Z",
        sourceRecordedAt: "2026-09-20T09:00:00Z",
        action: "Recorded the continued hearing date.",
        object: "2026-11-01",
        artifactId: `${matterId}-artifact-after`,
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.value, "October 1, 2026");
  assert.deepEqual(derived.evidenceIds, [`${matterId}-artifact-before`]);
});

test("important-date: invalid asOf is UNKNOWN", () => {
  const matterId = "test-matter-date-invalid-asof";
  const events = [
    scheduleStatusEvent({
      matterId,
      eventId: `${matterId}-schedule`,
      occurredAt: "2026-09-12T09:00:00Z",
      sourceRecordedAt: "2026-09-12T09:00:00Z",
      action: "Recorded the hearing date.",
      object: "2026-10-15",
    }),
  ];

  for (const asOf of ["", "   ", "not-a-date"]) {
    const derived = deriveImportantDateSlot(events, matterId, asOf);
    assert.equal(
      derived.state,
      "UNKNOWN",
      `Invalid asOf ${JSON.stringify(asOf)} must be explicit UNKNOWN`,
    );
    assert.notEqual(
      derived.value,
      "October 15, 2026",
      `Invalid asOf ${JSON.stringify(asOf)} must not keep a date`,
    );
  }
});

test("important-date: matter isolation ignores another matter's date", () => {
  const matterId = "test-matter-date-isolation";
  const otherMatterId = "test-matter-date-other";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId: otherMatterId,
        eventId: `${otherMatterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Recorded the hearing date.",
        object: "2026-10-15",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.equal(derived.evidenceIds.length, 0);
});

test("important-date: structured date wins over a different date in action text", () => {
  const matterId = "test-matter-date-structured-wins";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Noted an old target of October 1, 2026.",
        object: "2026-10-15",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "October 15, 2026");
});

test("owner: extra clauses do not keep a reversed assignment", () => {
  const cases: Array<{ action: string; expected: string }> = [
    {
      action: "Assigned to Alex Thompson in 2024, but he has since withdrawn.",
      expected: "Unknown",
    },
    {
      action: "Alex Thompson took over; he withdrew last week.",
      expected: "Unknown",
    },
    {
      action: "Assigned to Alex Thompson at intake; currently unassigned.",
      expected: "Unknown",
    },
    {
      action: "At first assigned to Alex Thompson.",
      expected: "Unknown",
    },
    {
      action: "Assigned to Alex Thompson.",
      expected: "Alex Thompson",
    },
    {
      action: "Alex Thompson took over.",
      expected: "Alex Thompson",
    },
    {
      action: "Named Rachel Morgan as counsel of record.",
      expected: "Rachel Morgan",
    },
    {
      action: "Assigned to Alex Thompson pending coverage.",
      expected: "Unknown",
    },
  ];

  for (const { action, expected } of cases) {
    const derived = deriveOwnerFromAction(
      `test-matter-owner-clause-${action.length}`,
      action,
      "Responsible attorney",
    );
    assert.equal(
      derived.value,
      expected,
      `${JSON.stringify(action)} must yield ${expected}, got ${derived.value}`,
    );
    if (expected === "Unknown") {
      assert.notEqual(
        derived.value,
        "Alex Thompson",
        `${JSON.stringify(action)} must not keep the reversed owner`,
      );
      assert.equal(derived.state, "UNKNOWN");
    }
  }
});

test("important-date: text dates require a positive scheduling form", () => {
  const cases: Array<{ action: string; expected: string }> = [
    { action: "continued from 2026-10-15", expected: "Unknown" },
    {
      action: "on 2026-10-15 continued; new date TBD",
      expected: "Unknown",
    },
    { action: "vacated (was 2026-10-15)", expected: "Unknown" },
    { action: "2026-10-15 cancelled", expected: "Unknown" },
    { action: "previously 2026-10-15", expected: "Unknown" },
    {
      action: "Respond to 2026-10-01 order by 2026-10-20",
      expected: "Unknown",
    },
    {
      action: "Hearing set for 2026-10-15",
      expected: "October 15, 2026",
    },
    {
      action: "Hearing scheduled for 2026-10-15 cancelled",
      expected: "Unknown",
    },
  ];

  for (const { action, expected } of cases) {
    const matterId = `test-matter-date-form-${action.length}`;
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-schedule`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );
    assert.equal(
      derived.value,
      expected,
      `${JSON.stringify(action)} must yield ${expected}, got ${derived.value}`,
    );
    assert.notEqual(
      derived.value,
      "October 1, 2026",
      `${JSON.stringify(action)} must not treat a bare to/from date as current`,
    );
    if (expected === "Unknown") {
      assert.equal(derived.state, "UNKNOWN");
      assert.notEqual(derived.value, "October 15, 2026");
    }
  }
});

test("important-date: invalid calendar date 2027-02-30 is UNKNOWN", () => {
  const matterId = "test-matter-date-invalid-feb-30";
  const structured = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-structured`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Recorded the hearing date.",
        object: "2027-02-30",
        artifactId: `${matterId}-artifact-structured`,
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );
  assert.equal(structured.state, "UNKNOWN");
  assert.equal(structured.value, "Unknown");
  assert.notEqual(
    structured.value,
    "March 2, 2027",
    "2027-02-30 must not roll over through Date.UTC",
  );

  const fromText = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-text`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Reported that the hearing is scheduled for 2027-02-30.",
        object: "Hearing",
        artifactId: `${matterId}-artifact-text`,
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );
  assert.equal(fromText.state, "UNKNOWN");
  assert.equal(fromText.value, "Unknown");
  assert.notEqual(fromText.value, "March 2, 2027");
});

test("owner: final-clause handoff to a known identity is current", () => {
  const cases: Array<{ action: string; expected: string }> = [
    { action: "Transferred to Rachel Morgan.", expected: "Rachel Morgan" },
    { action: "Reassigned to Rachel Morgan.", expected: "Rachel Morgan" },
    {
      action: "Rachel Morgan took over from Alex Thompson.",
      expected: "Rachel Morgan",
    },
    {
      action: "Alex Thompson withdrew; Rachel Morgan took over.",
      expected: "Rachel Morgan",
    },
    {
      action:
        "Alex Thompson resigned and the file was reassigned to Rachel Morgan.",
      expected: "Rachel Morgan",
    },
  ];

  for (const { action, expected } of cases) {
    const derived = deriveOwnerFromAction(
      `test-matter-owner-handoff-${action.length}`,
      action,
      "Responsible attorney",
    );
    assert.equal(
      derived.value,
      expected,
      `${JSON.stringify(action)} must yield ${expected}, got ${derived.value}`,
    );
    assert.notEqual(derived.value, "Alex Thompson");
    assert.notEqual(derived.state, "UNKNOWN");
  }
});

test("owner: two assigned names in the final clause stay UNKNOWN", () => {
  const derived = deriveOwnerFromAction(
    "test-matter-owner-two-in-final-clause",
    "Assigned to Alex Thompson and assigned to Rachel Morgan.",
    "Responsible attorney",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "Alex Thompson");
  assert.notEqual(derived.value, "Rachel Morgan");
});

test("important-date: clause-level cancel and historical words disqualify set-for/due dates", () => {
  const cases = [
    "previously set for 2026-10-15",
    "originally scheduled for 2026-10-15",
    "set for 2026-10-15 was vacated",
    "set for 2026-10-15 has been cancelled",
    "set for 2026-10-15 is off calendar",
    "set for 2026-10-15 continued without date",
    "Brief due 2026-10-15 was withdrawn",
  ];

  for (const action of cases) {
    const matterId = `test-matter-date-clause-${action.length}`;
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-schedule`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must be UNKNOWN, got ${derived.state} / ${derived.value}`,
    );
    assert.equal(derived.value, "Unknown");
    assert.notEqual(derived.value, "October 15, 2026");
  }
});

test("important-date: TBD in a later clause disqualifies an earlier set-for date", () => {
  const matterId = "test-matter-date-tbd-later-clause";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Hearing set for 2026-10-15; new date TBD",
        object: "Hearing",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(
    derived.value,
    "October 15, 2026",
    "TBD in a later clause must not leave the set-for date current",
  );
});

test("important-date: from immediately before a set-for date is UNKNOWN", () => {
  const matterId = "test-matter-date-from-before";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Hearing set for from 2026-10-15",
        object: "Hearing",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "October 15, 2026");
});

test("important-date: vacated shortly before a later set-for date is UNKNOWN", () => {
  const matterId = "test-matter-date-vacated-before";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "The setting was vacated. Hearing set for 2026-10-15",
        object: "Hearing",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(
    derived.value,
    "October 15, 2026",
    "vacated within 40 characters before the date must disqualify it",
  );
});

test("owner: transfer plus leftover and in the same clause is UNKNOWN", () => {
  const cases = [
    "Transferred to Rachel Morgan and later reassigned to Alex Thompson.",
    "Reassigned to Rachel Morgan and Alex Thompson.",
    "Transferred to Rachel Morgan and back to Alex Thompson.",
    "Transferred to Rachel Morgan and she resigned.",
    "Transferred to Rachel Morgan and she withdrew.",
  ];

  for (const action of cases) {
    const derived = deriveOwnerFromAction(
      `test-matter-owner-and-clause-${action.length}`,
      action,
      "Responsible attorney",
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must be UNKNOWN, got ${derived.state} / ${derived.value}`,
    );
    assert.equal(derived.value, "Unknown");
    assert.notEqual(derived.value, "Rachel Morgan");
    assert.notEqual(derived.value, "Alex Thompson");
  }
});

test("important-date: postponed and related clause words disqualify set-for Oct 15", () => {
  const cases = [
    "Hearing postponed, set for Oct 15, 2026",
    "Hearing adjourned, set for Oct 15, 2026",
    "Hearing stricken, set for Oct 15, 2026",
    "Hearing continued generally, set for Oct 15, 2026",
    "Hearing off the calendar, set for Oct 15, 2026",
    "Hearing formerly set for Oct 15, 2026",
    "Hearing dropped, set for Oct 15, 2026",
    "Hearing called off, set for Oct 15, 2026",
    "Hearing no longer set for Oct 15, 2026",
    "Hearing mooted, set for Oct 15, 2026",
  ];

  for (const action of cases) {
    const matterId = `test-matter-date-postponed-${action.length}`;
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-schedule`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must be UNKNOWN, got ${derived.state} / ${derived.value}`,
    );
    assert.equal(derived.value, "Unknown");
    assert.notEqual(derived.value, "October 15, 2026");
    assert.notEqual(derived.value, "2026-10-15");
  }
});

test("important-date: extra clause text around set-for/continuance is UNKNOWN", () => {
  const cases = [
    "Hearing set for Oct 15, 2026 struck.",
    "Hearing deferred, set for Oct 15, 2026",
    "Hearing stayed, set for Oct 15, 2026",
    "Hearing suspended, set for Oct 15, 2026",
    "Hearing rescinded, set for Oct 15, 2026",
    "Hearing on hold, set for Oct 15, 2026",
    "Hearing removed from calendar, set for Oct 15, 2026",
    "Hearing superseded, set for Oct 15, 2026",
    "Hearing will not go forward, set for Oct 15, 2026",
    "Hearing put off, set for Oct 15, 2026",
    "Initially set for Oct 15, 2026",
    "Hearing continued from 2026-10-15 to a later date",
    "Hearing set for Oct 15, 2026. Moved to a new date.",
    "Hearing set for Oct 15, 2026 rescheduled to a date TBA",
  ];

  for (const action of cases) {
    const matterId = `test-matter-date-struct-${action.length}`;
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-schedule`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must be UNKNOWN, got ${derived.state} / ${derived.value}`,
    );
    assert.equal(derived.value, "Unknown");
    assert.notEqual(derived.value, "October 15, 2026");
    assert.notEqual(derived.value, "2026-10-15");
  }
});

test("important-date: clean set-for with time and place is INFERRED", () => {
  const matterId = "test-matter-date-time-place";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "Hearing set for Oct 15, 2026 at 9:00 AM in Courtroom 3.",
        object: "Hearing",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "October 15, 2026");
});

test("important-date: continued from/to keeps the destination date", () => {
  const matterId = "test-matter-date-continued-from-to";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action: "continued from 2026-10-15 to 2026-11-20",
        object: "Hearing",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );
  assert.equal(derived.state, "INFERRED");
  assert.equal(derived.value, "November 20, 2026");
  assert.notEqual(derived.value, "October 15, 2026");
});

test("important-date: extra sentence, place tail, and subject words are UNKNOWN", () => {
  const cases = [
    "Hearing set for 2026-10-15. Hearing cancelled.",
    "Hearing set for 2026-10-15. It was stayed.",
    "Hearing set for 2026-10-15. Struck.",
    "2026-10-15 in Courtroom 4 deferred",
    "Hearing set for 2026-10-15 in Courtroom 4 deferred",
    "Hearing set for 2026-10-15 in Denver pending stay",
    "Hearing set for 2026-10-15 in theory",
    "Deadline by 2026-10-15 in limbo",
    "Deposition of Smith not set for 2026-10-15",
    "never scheduled for 2026-10-15",
    "Deposition of the witness who declined set for 2026-10-15",
  ];

  for (const action of cases) {
    const matterId = `test-matter-date-template-${action.length}`;
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-schedule`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must be UNKNOWN, got ${derived.state} / ${derived.value}`,
    );
    assert.equal(derived.value, "Unknown");
    assert.notEqual(derived.value, "October 15, 2026");
    assert.notEqual(derived.value, "2026-10-15");
  }
});

test("important-date: two clean dates in one statement are UNKNOWN", () => {
  const matterId = "test-matter-date-two-clean";
  const derived = deriveImportantDateSlot(
    [
      scheduleStatusEvent({
        matterId,
        eventId: `${matterId}-schedule`,
        occurredAt: "2026-09-12T09:00:00Z",
        sourceRecordedAt: "2026-09-12T09:00:00Z",
        action:
          "Hearing set for Oct 15, 2026 and Conference set for Nov 20, 2026",
        object: "Hearing",
      }),
    ],
    matterId,
    IMPORTANT_DATE_AS_OF,
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
  assert.notEqual(derived.value, "October 15, 2026");
  assert.notEqual(derived.value, "November 20, 2026");
});

test("important-date: place status words and ALL-CAPS are UNKNOWN", () => {
  const cases = [
    "Hearing set for 2026-10-15 in Denver CANCELLED",
    "Hearing set for 2026-10-15 in Denver Postponed.",
    "Hearing set for 2026-10-15 at Courthouse Vacated",
    "Hearing set for 2026-10-15 in Denver Off Calendar",
    "Hearing continued to 2026-11-20, later vacated",
  ];

  for (const action of cases) {
    const matterId = `test-matter-date-place-status-${action.length}`;
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-schedule`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must be UNKNOWN, got ${derived.state} / ${derived.value}`,
    );
    assert.equal(derived.value, "Unknown");
    assert.notEqual(derived.value, "October 15, 2026");
    assert.notEqual(derived.value, "November 20, 2026");
  }
});

test("important-date: room token without a digit or extra place word is UNKNOWN", () => {
  const cases = [
    "Hearing set for 2026-10-15 in Room Cancelled",
    "Hearing set for 2026-10-15 in Courtroom Vacated",
    "Hearing set for 2026-10-15 in Dept CANCELLED",
    "Hearing set for 2026-10-15 in Denver Superseded",
    "Hearing set for 2026-10-15 in Denver Rescinded",
    "Hearing set for 2026-10-15 in Denver Pending",
    "Hearing set for 2026-10-15 in Denver Abated",
    "Hearing set for 2026-10-15 in New York",
    "Hearing set for 2026-10-15 in Room 4-Cancelled",
    "Hearing set for 2026-10-15 in Room 4CANCELLED",
    "Hearing set for 2026-10-15 in Room 2026-11-20",
  ];

  for (const action of cases) {
    const matterId = `test-matter-date-place-digit-${action.length}`;
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-schedule`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );
    assert.equal(
      derived.state,
      "UNKNOWN",
      `${JSON.stringify(action)} must be UNKNOWN, got ${derived.state} / ${derived.value}`,
    );
    assert.equal(derived.value, "Unknown");
    assert.notEqual(derived.value, "October 15, 2026");
  }
});

test("important-date: courtroom id with a digit or a single city still resolves", () => {
  const cases: Array<{ action: string; expected: string }> = [
    {
      action: "Hearing set for Oct 15, 2026 in Courtroom 3.",
      expected: "October 15, 2026",
    },
    {
      action: "Hearing set for Oct 15, 2026 in Room 4B.",
      expected: "October 15, 2026",
    },
    {
      action: "Hearing set for Oct 15, 2026 in Denver.",
      expected: "October 15, 2026",
    },
  ];

  for (const { action, expected } of cases) {
    const matterId = `test-matter-date-place-ok-${action.length}`;
    const derived = deriveImportantDateSlot(
      [
        scheduleStatusEvent({
          matterId,
          eventId: `${matterId}-schedule`,
          occurredAt: "2026-09-12T09:00:00Z",
          sourceRecordedAt: "2026-09-12T09:00:00Z",
          action,
          object: "Hearing",
        }),
      ],
      matterId,
      IMPORTANT_DATE_AS_OF,
    );
    assert.equal(
      derived.value,
      expected,
      `${JSON.stringify(action)} must yield ${expected}, got ${derived.value}`,
    );
    assert.equal(derived.state, "INFERRED");
  }
});

// ============================================================================
// significant-information slot tests
// ============================================================================

// Test helper: clone existing Smith v. Acme DOCUMENT_SENT event/evidence with overrides
const baseDocEvent = extractedEvents.find(
  (e) => e.eventId === "email-0142-revised-language:document-sent"
)!;
const baseEvidence = syntheticEvidenceUniverse.find(
  (e) => e.id === "email-0142-revised-language"
)!;

function cloneDocEvent(overrides: Partial<OperationalEvent> = {}): OperationalEvent {
  return { ...structuredClone(baseDocEvent), ...overrides };
}

function cloneEvidence(overrides: Partial<EligibleEvidenceItem> = {}): EligibleEvidenceItem {
  const base = evidenceProcessing.eligibleEvidence.find(e => e.id === baseEvidence.id)!;
  return { ...structuredClone(base), ...overrides };
}

test("derived significant-information slot matches ground-truth expectation", () => {
  const derived = deriveSignificantNewInformationSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
    evidenceProcessing.eligibleEvidence,
    syntheticRequestingUser,
    syntheticCurrentStateGroundTruth.asOf,
  );
  const expectation = syntheticCurrentStateGroundTruth.expectations.find(
    (exp) => exp.slotId === "significant-information",
  );

  assert.ok(expectation, "Ground truth has significant-information expectation");
  assert.equal(derived.id, "significant-information");
  assert.equal(derived.state, expectation.expectedState);
  assert.equal(derived.value, expectation.expectedValue);

  const eventToArtifactMap = new Map(
    extractedEvents.map((event) => [event.eventId, event.provenance.sourceArtifactId]),
  );
  const expectedArtifactIds = expectation.supportingEventIds
    .map((eventId) => eventToArtifactMap.get(eventId))
    .filter((id): id is string => id !== undefined)
    .sort();
  const derivedArtifactIds = [...derived.evidenceIds].sort();
  assert.deepEqual(derivedArtifactIds, expectedArtifactIds);
});

test("significant-information: opposing-counsel email domain gives SUPPORTED", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-opposing-email" })
  ];
  const events = [cloneDocEvent({
    eventId: "test-evt-opposing",
    matterId: matter.id,
    actor: "Opposing counsel",
    object: "Settlement terms",
    occurredAt: "2026-09-16T14:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-opposing-email" }
  })];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Opposing counsel supplied settlement terms on September 16, 2026.");
  assert.deepEqual([...derived.evidenceIds], ["test-opposing-email"]);
});

test("significant-information: court actor gives SUPPORTED (role alone, no email)", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-court-doc", from: undefined })
  ];
  const events = [cloneDocEvent({
    eventId: "test-evt-court",
    matterId: matter.id,
    actor: "Court",
    object: "Scheduling order",
    occurredAt: "2026-09-16T14:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-court-doc" }
  })];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Court supplied scheduling order on September 16, 2026.");
});

test("significant-information: client email gives UNKNOWN", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-client-email", from: "jordan.smith@clientco.example" })
  ];
  const events = [cloneDocEvent({
    eventId: "test-evt-client",
    matterId: matter.id,
    actor: "Client",
    object: "Question",
    occurredAt: "2026-09-16T14:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-client-email" }
  })];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("significant-information: own-firm email gives UNKNOWN", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-firm-email", from: "paralegal@lawfirm.example" })
  ];
  const events = [cloneDocEvent({
    eventId: "test-evt-firm",
    matterId: matter.id,
    actor: "Paralegal",
    object: "Update",
    occurredAt: "2026-09-16T14:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-firm-email" }
  })];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("significant-information: client-side actor with client domain gives UNKNOWN", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-cfo-email", from: "cfo@smithco.example" })
  ];
  const events = [cloneDocEvent({
    eventId: "test-evt-cfo",
    matterId: matter.id,
    actor: "Client's CFO",
    object: "Internal memo",
    occurredAt: "2026-09-16T14:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-cfo-email" }
  })];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("significant-information: no actor with client domain gives UNKNOWN", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-no-actor-client", from: "cfo@smithco.example" })
  ];
  const events = [cloneDocEvent({
    eventId: "test-evt-no-actor-client",
    matterId: matter.id,
    actor: null,
    object: "Document",
    occurredAt: "2026-09-16T14:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-no-actor-client" }
  })];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("significant-information: no actor with personal domain gives UNKNOWN", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-no-actor-personal", from: "jordan.smith.personal@gmail.com" })
  ];
  const events = [cloneDocEvent({
    eventId: "test-evt-no-actor-personal",
    matterId: matter.id,
    actor: null,
    object: "Email",
    occurredAt: "2026-09-16T14:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-no-actor-personal" }
  })];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("significant-information: no actor with opposing-looking domain gives UNKNOWN", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-no-actor-opposing", from: "lawyer@opposing-firm.example" })
  ];
  const events = [cloneDocEvent({
    eventId: "test-evt-no-actor-opposing",
    matterId: matter.id,
    actor: null,
    object: "Letter",
    occurredAt: "2026-09-16T14:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-no-actor-opposing" }
  })];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});

test("significant-information: unidentifiable senders do not displace valid external doc", () => {
  const matter = syntheticMatters[0];
  const validEvidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-valid-external", from: "opposing@external-law.example" })
  ];
  const validEvent = cloneDocEvent({
    eventId: "test-evt-valid",
    matterId: matter.id,
    actor: "Opposing counsel",
    object: "Settlement proposal",
    occurredAt: "2026-09-16T10:00:00Z",
    provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-valid-external" }
  });

  const unidentifiableCases = [
    { actor: null, label: "null actor" },
    { actor: "Jamie Lee", label: "unknown name" },
    { actor: "Rachel", label: "first name" },
    { actor: "R. Morgan", label: "initials" },
    { actor: "Client's CFO", label: "client-side" },
    { actor: "Jordan Smith's assistant", label: "client assistant" },
  ];

  for (const testCase of unidentifiableCases) {
    const unidentifiableEvent = cloneDocEvent({
      eventId: `test-evt-${testCase.label.replace(/\s+/g, "-")}`,
      matterId: matter.id,
      actor: testCase.actor,
      object: "Later doc",
      occurredAt: "2026-09-16T14:00:00Z",
      provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-no-match" }
    });

    const events = [validEvent, unidentifiableEvent];
    const derived = deriveSignificantNewInformationSlot(
      events, matter.id, matter, validEvidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
    );

    assert.equal(derived.state, "SUPPORTED", `Case: ${testCase.label}`);
    assert.equal(
      derived.value, 
      "Opposing counsel supplied settlement proposal on September 16, 2026.",
      `Case: ${testCase.label}`
    );
    assert.deepEqual([...derived.evidenceIds], ["test-valid-external"], `Case: ${testCase.label}`);
  }
});

test("significant-information: chooses latest of two external documents", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-early", from: "opposing@external-law.example" }),
    cloneEvidence({ id: "test-later", from: "opposing@external-law.example" }),
  ];
  // Later event comes FIRST to test sorting, not array order
  const events = [
    cloneDocEvent({
      eventId: "test-evt-later",
      matterId: matter.id,
      actor: "Opposing counsel",
      object: "Revised proposal",
      occurredAt: "2026-09-15T14:00:00Z",
      provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-later" }
    }),
    cloneDocEvent({
      eventId: "test-evt-early",
      matterId: matter.id,
      actor: "Opposing counsel",
      object: "Early document",
      occurredAt: "2026-09-10T10:00:00Z",
      provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-early" }
    }),
  ];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-17T00:00:00Z"
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Opposing counsel supplied revised proposal on September 15, 2026.");
  assert.deepEqual([...derived.evidenceIds], ["test-later"]);
});

test("significant-information: excludes external document after asOf", () => {
  const matter = syntheticMatters[0];
  const evidence = [
    ...structuredClone(evidenceProcessing.eligibleEvidence),
    cloneEvidence({ id: "test-before", from: "opposing@external-law.example" }),
    cloneEvidence({ id: "test-after", from: "opposing@external-law.example" }),
  ];
  const events = [
    cloneDocEvent({
      eventId: "test-evt-before",
      matterId: matter.id,
      actor: "Opposing counsel",
      object: "Before cutoff",
      occurredAt: "2026-09-10T10:00:00Z",
      provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-before" }
    }),
    cloneDocEvent({
      eventId: "test-evt-after",
      matterId: matter.id,
      actor: "Opposing counsel",
      object: "After cutoff",
      occurredAt: "2026-09-20T14:00:00Z",
      provenance: { ...baseDocEvent.provenance, sourceArtifactId: "test-after" }
    }),
  ];

  const derived = deriveSignificantNewInformationSlot(
    events, matter.id, matter, evidence, syntheticRequestingUser, "2026-09-15T23:59:59Z"
  );

  assert.equal(derived.state, "SUPPORTED");
  assert.equal(derived.value, "Opposing counsel supplied before cutoff on September 10, 2026.");
  assert.deepEqual([...derived.evidenceIds], ["test-before"]);
});

test("significant-information: invalid asOf gives UNKNOWN", () => {
  const derived = deriveSignificantNewInformationSlot(
    extractedEvents,
    syntheticMatters[0].id,
    syntheticMatters[0],
    evidenceProcessing.eligibleEvidence,
    syntheticRequestingUser,
    "invalid-date",
  );
  assert.equal(derived.state, "UNKNOWN");
  assert.equal(derived.value, "Unknown");
});
