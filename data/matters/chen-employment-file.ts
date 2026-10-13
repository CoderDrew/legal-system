/**
 * Adversarial class: missing evidence.
 *
 * A thin employment file. Several slots' needed facts are absent, so
 * UNKNOWN is the honest current state. The Clio record is Active but
 * records no assignee. The only schedule report uses relative phrasing.
 * There is no waiting state, no approval, and no external document.
 *
 * Ground truth is written from this scenario's intent, not from
 * reasoner output.
 */
import type {
  CurrentStateGroundTruth,
  OperationalEventGroundTruth,
  SyntheticEvidenceItem,
  SyntheticMatter,
} from "@/types/mattermind";

export const chenEmploymentMatter: SyntheticMatter = {
  id: "matter-2026-0160",
  matterNumber: "2026-0160",
  name: "Chen Employment File",
  client: "Mei Chen",
  responsibleAttorney: "Sam Ortiz",
  status: "Active",
  participantIds: ["person-mei-chen", "user-rachel-morgan", "person-sam-ortiz"],
};

const rachel = ["user-rachel-morgan"];

export const chenEmploymentEvidence: SyntheticEvidenceItem[] = [
  {
    id: "clio-matter-0160",
    sourceSystem: "Clio",
    artifactType: "Matter record",
    timestamp: "2026-09-12T11:00:00Z",
    content:
      "Matter status: Active\nResponsible attorney: unassigned\nClient: Mei Chen",
    explicitMatterId: "matter-2026-0160",
    explicitMatterNumber: "2026-0160",
    participants: ["person-mei-chen", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0160-quarterly-hold",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-14T16:40:00Z",
    from: "rachel.morgan@lawfirm.example",
    to: ["mei.chen@example.com"],
    subject: "Matter #2026-0160 — Conference timing",
    content:
      "The internal conference remains scheduled for next quarter. I will send a calendar invite once a date is set.",
    explicitMatterId: "matter-2026-0160",
    explicitMatterNumber: "2026-0160",
    threadId: "thread-0160-hold",
    participants: ["person-mei-chen", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
];

export const chenEmploymentEventGroundTruth: OperationalEventGroundTruth = {
  "clio-matter-0160": [
    {
      eventId: "clio-matter-0160:matter-status-recorded",
      matterId: "matter-2026-0160",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-12T11:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      semantics: {
        recordedStatus: "active",
      },
      evidenceExcerpt: "Matter status: Active",
    },
    {
      eventId: "clio-matter-0160:responsibility-recorded",
      matterId: "matter-2026-0160",
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-09-12T11:00:00Z",
      actor: null,
      action: "Recorded that the responsible attorney is unassigned.",
      object: "Responsible attorney",
      semantics: {
        assignedPerson: null,
      },
      evidenceExcerpt: "Responsible attorney: unassigned",
    },
  ],
  "email-0160-quarterly-hold": [
    {
      eventId: "email-0160-quarterly-hold:schedule-status-reported",
      matterId: "matter-2026-0160",
      eventType: "SCHEDULE_STATUS_REPORTED",
      occurredAt: null,
      actor: "Rachel Morgan",
      action:
        "Reported that the internal conference remained scheduled for next quarter.",
      object: "Internal conference",
      semantics: {
        scheduledDate: null,
      },
      evidenceExcerpt:
        "The internal conference remains scheduled for next quarter.",
    },
  ],
};

export const chenEmploymentCurrentState: CurrentStateGroundTruth = {
  matterId: "matter-2026-0160",
  asOf: "2026-09-22T23:59:59Z",
  expectations: [
    {
      slotId: "current-status",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "An Active record-keeping row and a relative conference mention do not establish what the matter is currently doing. Operational current status is unknown.",
    },
    {
      slotId: "last-important-event",
      expectedState: "SUPPORTED",
      expectedValue:
        "September 14, 2026 — Rachel Morgan reported that the internal conference remained scheduled for next quarter.",
      supportingEventIds: [
        "email-0160-quarterly-hold:schedule-status-reported",
      ],
      supersededEventIds: [],
      rationale:
        "The schedule report is the only substantive event. Record-keeping Clio rows are not last-important-event material.",
    },
    {
      slotId: "waiting-on",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale: "No waiting state or approval request exists.",
    },
    {
      slotId: "next-action",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "No open wait and no document-sent or document-reviewed event from which a next step can be inferred.",
    },
    {
      slotId: "owner",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "The responsibility event explicitly records no current assignee (assignedPerson is null). The matter header name Sam Ortiz is not an event fact.",
    },
    {
      slotId: "important-date",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "The only schedule report uses relative phrasing ('next quarter'); scheduledDate is explicitly null.",
    },
    {
      slotId: "significant-information",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale: "No DOCUMENT_SENT event from an external party exists.",
    },
  ],
};
