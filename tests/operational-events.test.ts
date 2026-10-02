import assert from "node:assert/strict";
import test from "node:test";
import {
  syntheticEvidenceUniverse,
  syntheticMatters,
  syntheticOperationalEventGroundTruth,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import { buildEligibleEvidenceSet } from "@/lib/evidence-processing";
import { extractOperationalEvents } from "@/lib/operational-events";
import type { OperationalEventGroundTruth } from "@/types/mattermind";

const evidenceProcessing = buildEligibleEvidenceSet({
  user: syntheticRequestingUser,
  selectedMatter: syntheticMatters[0],
  evidenceUniverse: syntheticEvidenceUniverse,
});

function extract(
  groundTruth: OperationalEventGroundTruth =
    syntheticOperationalEventGroundTruth,
) {
  return extractOperationalEvents({
    eligibleEvidence: evidenceProcessing.eligibleEvidence,
    groundTruth,
    matterId: syntheticMatters[0].id,
  });
}

test("each eligible artifact produces its hand-checked ground-truth events", () => {
  const eventTypesByArtifact: Record<string, string[]> = {};

  for (const event of extract()) {
    const artifactId = event.provenance.sourceArtifactId;
    eventTypesByArtifact[artifactId] ??= [];
    eventTypesByArtifact[artifactId].push(event.eventType);
  }

  assert.deepEqual(
    evidenceProcessing.eligibleEvidence.map((item) => item.id),
    [
      "email-0142-scheduling",
      "email-0142-waiting-on-counsel",
      "email-0142-revised-language",
      "attachment-0142-revised-agreement",
      "clio-matter-0142",
      "email-0142-client-approval",
    ],
  );
  assert.deepEqual(
    Object.fromEntries(
      evidenceProcessing.eligibleEvidence.map((item) => [
        item.id,
        eventTypesByArtifact[item.id] ?? [],
      ]),
    ),
    {
      "email-0142-scheduling": ["SCHEDULE_STATUS_REPORTED"],
      "email-0142-waiting-on-counsel": ["WAITING_STATE_REPORTED"],
      "email-0142-revised-language": ["DOCUMENT_SENT"],
      "attachment-0142-revised-agreement": [],
      "clio-matter-0142": [
        "MATTER_STATUS_RECORDED",
        "RESPONSIBILITY_RECORDED",
      ],
      "email-0142-client-approval": [
        "APPROVAL_REQUESTED",
        "DOCUMENT_REVIEWED",
      ],
    },
  );
});

test("only eligible evidence can produce operational events", () => {
  const groundTruthWithIneligibleArtifact: OperationalEventGroundTruth = {
    ...syntheticOperationalEventGroundTruth,
    "email-0142-unauthorized-private": [
      {
        eventId: "email-0142-unauthorized-private:should-never-appear",
        matterId: "matter-2026-0142",
        eventType: "MATTER_STATUS_RECORDED",
        occurredAt: "2026-09-18T10:00:00Z",
        actor: "Private partner",
        action: "This event must remain outside the extraction boundary.",
        object: "Private management discussion",
      },
    ],
  };

  assert.equal(
    extract(groundTruthWithIneligibleArtifact).some(
      (event) =>
        event.provenance.sourceArtifactId ===
        "email-0142-unauthorized-private",
    ),
    false,
  );
});

test("every event preserves the eligible artifact's provenance", () => {
  const revisedLanguageEvent = extract().find(
    (event) =>
      event.eventId === "email-0142-revised-language:document-sent",
  );

  assert.ok(revisedLanguageEvent);
  assert.deepEqual(revisedLanguageEvent.provenance, {
    sourceArtifactId: "email-0142-revised-language",
    sourceSystem: "Outlook",
    sourceRecordedAt: "2026-09-16T14:20:00Z",
    associationMethod: "EXPLICIT_MATTER_ID",
    evidenceExcerpt:
      "Attached is the revised settlement language incorporating the changes discussed yesterday. Please review with your client and let us know whether the revisions are acceptable.",
  });
  assert.equal(
    revisedLanguageEvent.extractionMethod,
    "SYNTHETIC_GROUND_TRUTH",
  );
});

test("the complete extracted event history matches independent ground truth", () => {
  assert.deepEqual(extract(), [
    {
      eventId: "email-0142-scheduling:schedule-status-reported",
      matterId: "matter-2026-0142",
      eventType: "SCHEDULE_STATUS_REPORTED",
      occurredAt: null,
      actor: "Rachel Morgan",
      action:
        "Reported that the settlement conference remained scheduled for next month.",
      object: "Settlement conference",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "email-0142-scheduling",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-10T15:30:00Z",
        associationMethod: "EXPLICIT_MATTER_NUMBER",
        evidenceExcerpt:
          "The settlement conference remains scheduled for next month. I will send preparation details separately.",
      },
    },
    {
      eventId: "email-0142-waiting-on-counsel:waiting-state-reported",
      matterId: "matter-2026-0142",
      eventType: "WAITING_STATE_REPORTED",
      occurredAt: "2026-09-12T16:15:00Z",
      actor: "Rachel Morgan",
      action:
        "Reported that the matter team was waiting for opposing counsel to send revised settlement language.",
      object: "Revised settlement language",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "email-0142-waiting-on-counsel",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-12T16:15:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt:
          "We are waiting for opposing counsel to send the revised settlement language.",
      },
    },
    {
      eventId: "email-0142-revised-language:document-sent",
      matterId: "matter-2026-0142",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T14:20:00Z",
      actor: "Opposing counsel",
      action: "Sent revised settlement language to the matter team.",
      object: "Revised settlement language",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "email-0142-revised-language",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-16T14:20:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt:
          "Attached is the revised settlement language incorporating the changes discussed yesterday. Please review with your client and let us know whether the revisions are acceptable.",
      },
    },
    {
      eventId: "clio-matter-0142:matter-status-recorded",
      matterId: "matter-2026-0142",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-17T09:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "clio-matter-0142",
        sourceSystem: "Clio",
        sourceRecordedAt: "2026-09-17T09:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt:
          "Matter status: Active\nResponsible attorney: Rachel Morgan\nClient: Jordan Smith",
      },
    },
    {
      eventId: "clio-matter-0142:responsibility-recorded",
      matterId: "matter-2026-0142",
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-09-17T09:00:00Z",
      actor: null,
      action: "Recorded Rachel Morgan as the responsible attorney.",
      object: "Responsible attorney",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "clio-matter-0142",
        sourceSystem: "Clio",
        sourceRecordedAt: "2026-09-17T09:00:00Z",
        associationMethod: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
        evidenceExcerpt:
          "Matter status: Active\nResponsible attorney: Rachel Morgan\nClient: Jordan Smith",
      },
    },
    {
      eventId: "email-0142-client-approval:approval-requested",
      matterId: "matter-2026-0142",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T17:45:00Z",
      actor: "Rachel Morgan",
      action: "Requested Jordan Smith's approval before responding.",
      object: "Revised settlement language",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "email-0142-client-approval",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T17:45:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt:
          "Jordan, opposing counsel sent revised settlement language yesterday. I reviewed the changes and would like your approval before I respond. Please let me know whether you are comfortable accepting these revisions.",
      },
    },
    {
      eventId: "email-0142-client-approval:document-reviewed",
      matterId: "matter-2026-0142",
      eventType: "DOCUMENT_REVIEWED",
      occurredAt: null,
      actor: "Rachel Morgan",
      action: "Reported reviewing the revised settlement language.",
      object: "Revised settlement language",
      extractionMethod: "SYNTHETIC_GROUND_TRUTH",
      provenance: {
        sourceArtifactId: "email-0142-client-approval",
        sourceSystem: "Outlook",
        sourceRecordedAt: "2026-09-17T17:45:00Z",
        associationMethod: "EXPLICIT_MATTER_ID",
        evidenceExcerpt:
          "Jordan, opposing counsel sent revised settlement language yesterday. I reviewed the changes and would like your approval before I respond. Please let me know whether you are comfortable accepting these revisions.",
      },
    },
  ]);
});

test("event drafts for another matter are rejected at extraction", () => {
  const mismatchedGroundTruth: OperationalEventGroundTruth = {
    "email-0142-scheduling": [
      {
        eventId: "email-0142-scheduling:wrong-matter",
        matterId: "matter-2026-0159",
        eventType: "SCHEDULE_STATUS_REPORTED",
        occurredAt: null,
        actor: "Rachel Morgan",
        action: "This event belongs to another matter.",
        object: "Settlement conference",
      },
    ],
  };

  assert.throws(
    () => extract(mismatchedGroundTruth),
    /does not match selected matter matter-2026-0142/,
  );
});

test("unknown event details remain null instead of being inferred", () => {
  const events = extract();
  const schedule = events.find(
    (event) =>
      event.eventId ===
      "email-0142-scheduling:schedule-status-reported",
  );
  const review = events.find(
    (event) =>
      event.eventId === "email-0142-client-approval:document-reviewed",
  );
  const recordedStatus = events.find(
    (event) => event.eventId === "clio-matter-0142:matter-status-recorded",
  );

  assert.ok(schedule);
  assert.equal(schedule.occurredAt, null);
  assert.ok(review);
  assert.equal(review.occurredAt, null);
  assert.ok(recordedStatus);
  assert.equal(recordedStatus.actor, null);
});

test("events are deterministically ordered by source time and event ID", () => {
  assert.deepEqual(
    extract().map((event) => event.eventId),
    [
      "email-0142-scheduling:schedule-status-reported",
      "email-0142-waiting-on-counsel:waiting-state-reported",
      "email-0142-revised-language:document-sent",
      "clio-matter-0142:matter-status-recorded",
      "clio-matter-0142:responsibility-recorded",
      "email-0142-client-approval:approval-requested",
      "email-0142-client-approval:document-reviewed",
    ],
  );
});

test("event ID ordering is independent of the runtime locale", () => {
  const eligibleEvidence = [evidenceProcessing.eligibleEvidence[0]];
  const groundTruth: OperationalEventGroundTruth = {
    "email-0142-scheduling": [
      {
        eventId: "event-ä",
        matterId: "matter-2026-0142",
        eventType: "SCHEDULE_STATUS_REPORTED",
        occurredAt: null,
        actor: null,
        action: "Second by code-point order.",
        object: null,
      },
      {
        eventId: "event-z",
        matterId: "matter-2026-0142",
        eventType: "SCHEDULE_STATUS_REPORTED",
        occurredAt: null,
        actor: null,
        action: "First by code-point order.",
        object: null,
      },
    ],
  };

  assert.deepEqual(
    extractOperationalEvents({
      eligibleEvidence,
      groundTruth,
      matterId: "matter-2026-0142",
    }).map((event) => event.eventId),
    ["event-z", "event-ä"],
  );
});
