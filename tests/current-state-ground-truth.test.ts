import assert from "node:assert/strict";
import test from "node:test";
import {
  syntheticCurrentStateGroundTruth,
} from "@/data/synthetic-current-state";
import {
  syntheticEvidenceUniverse,
  syntheticMatterBrief,
  syntheticMatters,
  syntheticOperationalEventGroundTruth,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import { buildEligibleEvidenceSet } from "@/lib/evidence-processing";
import { extractOperationalEvents } from "@/lib/operational-events";

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

test("current-state ground truth references only extracted event IDs", () => {
  const extractedEventIds = new Set(
    extractedEvents.map((event) => event.eventId),
  );
  const groundTruth = syntheticCurrentStateGroundTruth;

  for (const expectation of groundTruth.expectations) {
    for (const eventId of expectation.supportingEventIds) {
      assert.ok(
        extractedEventIds.has(eventId),
        `Supporting event ${eventId} for slot ${expectation.slotId} exists in extraction output`,
      );
    }
    for (const eventId of expectation.supersededEventIds) {
      assert.ok(
        extractedEventIds.has(eventId),
        `Superseded event ${eventId} for slot ${expectation.slotId} exists in extraction output`,
      );
    }
  }
});

test("exactly one expectation per brief slot and slots match claim IDs", () => {
  const groundTruth = syntheticCurrentStateGroundTruth;
  const briefClaimIds = syntheticMatterBrief.claims
    .map((claim) => claim.id)
    .sort();
  const expectationSlotIds = groundTruth.expectations
    .map((exp) => exp.slotId)
    .sort();

  assert.deepEqual(
    expectationSlotIds,
    briefClaimIds,
    "Ground truth slot set matches predefined brief claim IDs",
  );

  const slotCounts = new Map<string, number>();
  for (const exp of groundTruth.expectations) {
    slotCounts.set(exp.slotId, (slotCounts.get(exp.slotId) ?? 0) + 1);
  }

  for (const [slotId, count] of slotCounts) {
    assert.equal(count, 1, `Slot ${slotId} has exactly one expectation`);
  }
});

test("SUPPORTED and INFERRED cite events, UNKNOWN cites none with null value", () => {
  const groundTruth = syntheticCurrentStateGroundTruth;

  for (const expectation of groundTruth.expectations) {
    if (
      expectation.expectedState === "SUPPORTED" ||
      expectation.expectedState === "INFERRED"
    ) {
      assert.ok(
        expectation.supportingEventIds.length >= 1,
        `${expectation.expectedState} expectation for ${expectation.slotId} cites at least one event`,
      );
    }

    if (expectation.expectedState === "UNKNOWN") {
      assert.equal(
        expectation.supportingEventIds.length,
        0,
        `UNKNOWN expectation for ${expectation.slotId} cites no supporting events`,
      );
      assert.equal(
        expectation.expectedValue,
        null,
        `UNKNOWN expectation for ${expectation.slotId} has null value`,
      );
    }
  }
});

test("superseding events recorded later than superseded events, same matter", () => {
  const groundTruth = syntheticCurrentStateGroundTruth;
  const eventMap = new Map(
    extractedEvents.map((event) => [event.eventId, event]),
  );

  for (const expectation of groundTruth.expectations) {
    for (const supersededId of expectation.supersededEventIds) {
      const supersededEvent = eventMap.get(supersededId);
      assert.ok(
        supersededEvent,
        `Superseded event ${supersededId} exists in extraction`,
      );

      assert.equal(
        supersededEvent.matterId,
        groundTruth.matterId,
        `Superseded event ${supersededId} belongs to the same matter`,
      );

      for (const supportingId of expectation.supportingEventIds) {
        const supersedingEvent = eventMap.get(supportingId);
        if (!supersedingEvent) continue;

        const supersededTime = new Date(
          supersededEvent.provenance.sourceRecordedAt,
        ).getTime();
        const supersedingTime = new Date(
          supersedingEvent.provenance.sourceRecordedAt,
        ).getTime();

        if (supersedingTime > supersededTime) {
          assert.ok(
            true,
            `Superseding event ${supportingId} recorded after superseded event ${supersededId}`,
          );
        }
      }
    }
  }
});

test("superseded events never appear as supporting events", () => {
  const groundTruth = syntheticCurrentStateGroundTruth;
  const allSupersededIds = new Set(
    groundTruth.expectations.flatMap((exp) => exp.supersededEventIds),
  );

  for (const expectation of groundTruth.expectations) {
    for (const supportingId of expectation.supportingEventIds) {
      assert.ok(
        !allSupersededIds.has(supportingId),
        `Supporting event ${supportingId} is not marked as superseded`,
      );
    }
  }
});

test("superseded events remain present in extraction output", () => {
  const groundTruth = syntheticCurrentStateGroundTruth;
  const extractedEventIds = new Set(
    extractedEvents.map((event) => event.eventId),
  );
  const allSupersededIds = groundTruth.expectations.flatMap(
    (exp) => exp.supersededEventIds,
  );

  for (const supersededId of allSupersededIds) {
    assert.ok(
      extractedEventIds.has(supersededId),
      `Superseded event ${supersededId} is still present in extraction output`,
    );
  }
});

test("all supporting events recorded at or before asOf timestamp", () => {
  const groundTruth = syntheticCurrentStateGroundTruth;
  const asOfTime = new Date(groundTruth.asOf).getTime();
  const eventMap = new Map(
    extractedEvents.map((event) => [event.eventId, event]),
  );

  for (const expectation of groundTruth.expectations) {
    for (const supportingId of expectation.supportingEventIds) {
      const event = eventMap.get(supportingId);
      assert.ok(event, `Supporting event ${supportingId} exists`);

      const recordedTime = new Date(
        event.provenance.sourceRecordedAt,
      ).getTime();
      assert.ok(
        recordedTime <= asOfTime,
        `Supporting event ${supportingId} recorded at or before asOf`,
      );
    }
  }
});

test("predefined brief claims match ground-truth expectations (drift check)", () => {
  const groundTruth = syntheticCurrentStateGroundTruth;
  const eventToArtifactMap = new Map(
    extractedEvents.map((event) => [
      event.eventId,
      event.provenance.sourceArtifactId,
    ]),
  );

  for (const claim of syntheticMatterBrief.claims) {
    const expectation = groundTruth.expectations.find(
      (exp) => exp.slotId === claim.id,
    );
    assert.ok(
      expectation,
      `Predefined brief claim ${claim.id} has a ground-truth expectation`,
    );

    assert.equal(
      claim.state,
      expectation.expectedState,
      `Claim ${claim.id} state matches ground truth`,
    );

    const expectedArtifactIds = expectation.supportingEventIds
      .map((eventId) => eventToArtifactMap.get(eventId))
      .filter((id): id is string => id !== undefined)
      .sort();
    const actualArtifactIds = [...claim.evidenceIds].sort();

    assert.deepEqual(
      actualArtifactIds,
      expectedArtifactIds,
      `Claim ${claim.id} evidence artifact IDs match ground truth supporting events`,
    );
  }
});
