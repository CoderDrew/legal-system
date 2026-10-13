/**
 * Adversarial class: conflicting evidence.
 *
 * Two sources recorded at the same instant disagree on the current
 * owner (Casey Blake vs Rachel Morgan) and on the hearing date
 * (October 8 vs October 22). Neither report supersedes the other.
 * Those slots are CONFLICTING. Other slots have a single consistent
 * story: revised answer awaiting client approval.
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

export const riveraNorthwindMatter: SyntheticMatter = {
  id: "matter-2026-0161",
  matterNumber: "2026-0161",
  name: "Rivera v. Northwind",
  client: "Luis Rivera",
  responsibleAttorney: "Casey Blake",
  status: "Active",
  participantIds: [
    "person-luis-rivera",
    "user-rachel-morgan",
    "person-casey-blake",
    "person-northwind-counsel",
  ],
};

const rachel = ["user-rachel-morgan"];

export const riveraNorthwindEvidence: SyntheticEvidenceItem[] = [
  {
    id: "clio-matter-0161",
    sourceSystem: "Clio",
    artifactType: "Matter record",
    timestamp: "2026-09-18T12:00:00Z",
    content:
      "Matter status: Active\nResponsible attorney: Casey Blake\nClient: Luis Rivera",
    explicitMatterId: "matter-2026-0161",
    explicitMatterNumber: "2026-0161",
    participants: [
      "person-luis-rivera",
      "user-rachel-morgan",
      "person-casey-blake",
    ],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0161-owner-alt",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-18T12:00:00Z",
    from: "staffing@lawfirm.example",
    to: ["rachel.morgan@lawfirm.example"],
    subject: "Matter #2026-0161 — Coverage note",
    content:
      "Coverage note recorded at noon: Responsible attorney: Rachel Morgan.",
    explicitMatterId: "matter-2026-0161",
    explicitMatterNumber: "2026-0161",
    threadId: "thread-0161-coverage",
    participants: ["user-rachel-morgan", "person-casey-blake"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0161-hearing-oct8",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-19T15:00:00Z",
    from: "rachel.morgan@lawfirm.example",
    to: ["luis.rivera@example.com"],
    subject: "Matter #2026-0161 — Hearing date (calendar A)",
    content: "The motion hearing remains scheduled for 2026-10-08.",
    explicitMatterId: "matter-2026-0161",
    explicitMatterNumber: "2026-0161",
    threadId: "thread-0161-hearing-a",
    participants: ["person-luis-rivera", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0161-hearing-oct22",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-19T15:00:00Z",
    from: "docket@court.example",
    to: ["rachel.morgan@lawfirm.example"],
    subject: "Matter #2026-0161 — Hearing date (calendar B)",
    content: "The motion hearing remains scheduled for 2026-10-22.",
    explicitMatterId: "matter-2026-0161",
    explicitMatterNumber: "2026-0161",
    threadId: "thread-0161-hearing-b",
    participants: ["user-rachel-morgan", "person-northwind-counsel"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0161-revised-answer",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-20T14:10:00Z",
    from: "northwind.counsel@example.com",
    to: ["rachel.morgan@lawfirm.example"],
    subject: "Rivera v. Northwind — Revised answer",
    content:
      "Attached is the revised answer. Please review with your client and let us know whether the revisions are acceptable.",
    explicitMatterId: "matter-2026-0161",
    explicitMatterNumber: "2026-0161",
    threadId: "thread-0161-answer",
    participants: ["person-northwind-counsel", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0161-client-approval",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-20T17:00:00Z",
    from: "casey.blake@lawfirm.example",
    to: ["luis.rivera@example.com"],
    cc: ["rachel.morgan@lawfirm.example"],
    subject: "Rivera v. Northwind — Revised answer for your approval",
    content:
      "Luis, opposing counsel sent a revised answer. I would like your approval before I respond.",
    explicitMatterId: "matter-2026-0161",
    explicitMatterNumber: "2026-0161",
    threadId: "thread-0161-answer",
    participants: ["person-luis-rivera", "user-rachel-morgan", "person-casey-blake"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0161-unauthorized-private",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-21T09:00:00Z",
    from: "partner.private@lawfirm.example",
    to: ["firm.management@lawfirm.example"],
    subject: "Matter #2026-0161 — Privileged staffing discussion",
    content: "Private staffing discussion not available to Rachel Morgan.",
    explicitMatterNumber: "2026-0161",
    threadId: "thread-0161-private",
    participants: ["person-private-partner"],
    authorizedUserIds: ["user-private-partner"],
  },
];

export const riveraNorthwindEventGroundTruth: OperationalEventGroundTruth = {
  "clio-matter-0161": [
    {
      eventId: "clio-matter-0161:matter-status-recorded",
      matterId: "matter-2026-0161",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-18T12:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      semantics: {
        recordedStatus: "active",
      },
      evidenceExcerpt: "Matter status: Active",
    },
    {
      eventId: "clio-matter-0161:responsibility-recorded",
      matterId: "matter-2026-0161",
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-09-18T12:00:00Z",
      actor: null,
      action: "Recorded Casey Blake as the responsible attorney.",
      object: "Responsible attorney",
      semantics: {
        assignedPerson: "Casey Blake",
      },
      evidenceExcerpt: "Responsible attorney: Casey Blake",
    },
  ],
  "email-0161-owner-alt": [
    {
      eventId: "email-0161-owner-alt:responsibility-recorded",
      matterId: "matter-2026-0161",
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-09-18T12:00:00Z",
      actor: null,
      action: "Recorded Rachel Morgan as the responsible attorney.",
      object: "Responsible attorney",
      semantics: {
        assignedPerson: "Rachel Morgan",
      },
      evidenceExcerpt: "Responsible attorney: Rachel Morgan",
    },
  ],
  "email-0161-hearing-oct8": [
    {
      eventId: "email-0161-hearing-oct8:schedule-status-reported",
      matterId: "matter-2026-0161",
      eventType: "SCHEDULE_STATUS_REPORTED",
      occurredAt: "2026-09-19T15:00:00Z",
      actor: "Rachel Morgan",
      action: "Reported that the motion hearing remained scheduled for 2026-10-08.",
      object: "Motion hearing",
      semantics: {
        scheduledDate: "2026-10-08",
      },
      evidenceExcerpt: "The motion hearing remains scheduled for 2026-10-08.",
    },
  ],
  "email-0161-hearing-oct22": [
    {
      eventId: "email-0161-hearing-oct22:schedule-status-reported",
      matterId: "matter-2026-0161",
      eventType: "SCHEDULE_STATUS_REPORTED",
      occurredAt: "2026-09-19T15:00:00Z",
      actor: "Court",
      action: "Reported that the motion hearing remained scheduled for 2026-10-22.",
      object: "Motion hearing",
      semantics: {
        scheduledDate: "2026-10-22",
      },
      evidenceExcerpt: "The motion hearing remains scheduled for 2026-10-22.",
    },
  ],
  "email-0161-revised-answer": [
    {
      eventId: "email-0161-revised-answer:document-sent",
      matterId: "matter-2026-0161",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-20T14:10:00Z",
      actor: "Opposing counsel",
      action: "Sent a revised answer to the matter team.",
      object: "Revised answer",
      semantics: {
        documentForm: "revised",
        documentSubject: "answer",
      },
      evidenceExcerpt: "Attached is the revised answer.",
    },
  ],
  "email-0161-client-approval": [
    {
      eventId: "email-0161-client-approval:approval-requested",
      matterId: "matter-2026-0161",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-20T17:00:00Z",
      actor: "Casey Blake",
      action: "Requested Luis Rivera's approval before responding.",
      object: "Revised answer",
      semantics: {
        approvalKind: "client_approval",
      },
      evidenceExcerpt: "I would like your approval before I respond",
    },
  ],
};

export const riveraNorthwindCurrentState: CurrentStateGroundTruth = {
  matterId: "matter-2026-0161",
  asOf: "2026-09-22T23:59:59Z",
  expectations: [
    {
      slotId: "current-status",
      expectedState: "SUPPORTED",
      expectedValue: "Answer revisions are awaiting client approval.",
      supportingEventIds: [
        "email-0161-revised-answer:document-sent",
        "email-0161-client-approval:approval-requested",
      ],
      supersededEventIds: [],
      rationale:
        "The revised answer and the later client-approval request agree. Owner and date conflicts do not change that operational status.",
    },
    {
      slotId: "last-important-event",
      expectedState: "SUPPORTED",
      expectedValue:
        "September 20, 2026 — Attorney requested client approval of the revised answer.",
      supportingEventIds: ["email-0161-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "The last substantive event is the responsible attorney requesting Luis Rivera's approval of the revised answer.",
    },
    {
      slotId: "waiting-on",
      expectedState: "SUPPORTED",
      expectedValue: "Client approval",
      supportingEventIds: ["email-0161-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale: "Approval was sent to luis.rivera@example.com, the client.",
    },
    {
      slotId: "next-action",
      expectedState: "INFERRED",
      expectedValue:
        "Respond to opposing counsel after the client makes a decision.",
      supportingEventIds: ["email-0161-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "The pending approval is of opposing counsel's revised answer.",
    },
    {
      slotId: "owner",
      expectedState: "CONFLICTING",
      expectedValue: null,
      supportingEventIds: [
        "clio-matter-0161:responsibility-recorded",
        "email-0161-owner-alt:responsibility-recorded",
      ],
      supersededEventIds: [],
      rationale:
        "Two RESPONSIBILITY_RECORDED facts at the same timestamp disagree (Casey Blake vs Rachel Morgan). Neither supersedes the other, so owner is conflicting rather than a single confident name.",
    },
    {
      slotId: "important-date",
      expectedState: "CONFLICTING",
      expectedValue: null,
      supportingEventIds: [
        "email-0161-hearing-oct8:schedule-status-reported",
        "email-0161-hearing-oct22:schedule-status-reported",
      ],
      supersededEventIds: [],
      rationale:
        "Two SCHEDULE_STATUS_REPORTED facts at the same timestamp disagree (2026-10-08 vs 2026-10-22). Neither is a continuance of the other.",
    },
    {
      slotId: "significant-information",
      expectedState: "SUPPORTED",
      expectedValue:
        "Opposing counsel supplied revised answer on September 20, 2026.",
      supportingEventIds: ["email-0161-revised-answer:document-sent"],
      supersededEventIds: [],
      rationale: "The only external DOCUMENT_SENT is the revised answer.",
    },
  ],
};
