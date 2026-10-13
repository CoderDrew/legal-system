/**
 * Adversarial class: stale evidence.
 *
 * Covers both a re-opened matter and a continuance:
 * 1. Revised contract arrives; client approval is requested.
 * 2. Hearing is set for September 20.
 * 3. Matter is recorded Closed.
 * 4. Matter is re-opened (Active).
 * 5. Hearing is continued to November 12.
 * 6. New discovery arrives from opposing counsel.
 * 7. The live wait is the client's review of that discovery.
 *
 * Pre-close approval, the September 20 hearing, and the Closed status
 * are historical. They must not describe current state.
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

export const patelHarborMatter: SyntheticMatter = {
  id: "matter-2026-0162",
  matterNumber: "2026-0162",
  name: "Patel v. Harbor Logistics",
  client: "Anika Patel",
  responsibleAttorney: "Priya Nair",
  status: "Active",
  participantIds: [
    "person-anika-patel",
    "user-rachel-morgan",
    "person-priya-nair",
    "person-harbor-counsel",
  ],
};

const rachel = ["user-rachel-morgan"];

export const patelHarborEvidence: SyntheticEvidenceItem[] = [
  {
    id: "clio-matter-0162-opened",
    sourceSystem: "Clio",
    artifactType: "Matter record",
    timestamp: "2026-08-18T09:00:00Z",
    content:
      "Matter status: Active\nResponsible attorney: Priya Nair\nClient: Anika Patel",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    participants: ["person-anika-patel", "user-rachel-morgan", "person-priya-nair"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0162-revised-contract",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-08-20T14:00:00Z",
    from: "harbor.counsel@example.com",
    to: ["rachel.morgan@lawfirm.example"],
    subject: "Patel v. Harbor Logistics — Revised contract",
    content: "Attached is the revised contract incorporating last week's discussion.",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    threadId: "thread-0162-contract",
    participants: ["person-harbor-counsel", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0162-approval-request",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-08-22T16:00:00Z",
    from: "priya.nair@lawfirm.example",
    to: ["anika.patel@example.com"],
    cc: ["rachel.morgan@lawfirm.example"],
    subject: "Patel v. Harbor Logistics — Revised contract for approval",
    content:
      "Anika, opposing counsel sent a revised contract. I would like your approval before I respond.",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    threadId: "thread-0162-contract",
    participants: ["person-anika-patel", "user-rachel-morgan", "person-priya-nair"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0162-hearing-set",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-01T10:00:00Z",
    from: "rachel.morgan@lawfirm.example",
    to: ["anika.patel@example.com"],
    subject: "Matter #2026-0162 — Hearing date",
    content: "The motion hearing is scheduled for 2026-09-20.",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    threadId: "thread-0162-hearing",
    participants: ["person-anika-patel", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "clio-matter-0162-closed",
    sourceSystem: "Clio",
    artifactType: "Matter record",
    timestamp: "2026-09-08T09:00:00Z",
    content:
      "Matter status: Closed\nResponsible attorney: Priya Nair\nClient: Anika Patel",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    participants: ["person-anika-patel", "user-rachel-morgan", "person-priya-nair"],
    authorizedUserIds: rachel,
  },
  {
    id: "clio-matter-0162-reopened",
    sourceSystem: "Clio",
    artifactType: "Matter record",
    timestamp: "2026-09-12T09:00:00Z",
    content:
      "Matter status: Active\nResponsible attorney: Priya Nair\nClient: Anika Patel\nNote: Matter re-opened.",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    participants: ["person-anika-patel", "user-rachel-morgan", "person-priya-nair"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0162-hearing-continued",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-15T11:30:00Z",
    from: "rachel.morgan@lawfirm.example",
    to: ["anika.patel@example.com"],
    subject: "Matter #2026-0162 — Hearing continued",
    content:
      "The motion hearing was continued from 2026-09-20 to 2026-11-12.",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    threadId: "thread-0162-hearing",
    participants: ["person-anika-patel", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0162-discovery-received",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-18T13:45:00Z",
    from: "harbor.counsel@example.com",
    to: ["rachel.morgan@lawfirm.example"],
    subject: "Patel v. Harbor Logistics — Discovery responses",
    content: "Attached are Harbor Logistics' discovery responses.",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    threadId: "thread-0162-discovery",
    participants: ["person-harbor-counsel", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0162-waiting-client-review",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-19T15:20:00Z",
    from: "rachel.morgan@lawfirm.example",
    to: ["anika.patel@example.com"],
    subject: "Matter #2026-0162 — Discovery responses for review",
    content:
      "We are waiting for the client's review of the discovery responses before we reply.",
    explicitMatterId: "matter-2026-0162",
    explicitMatterNumber: "2026-0162",
    threadId: "thread-0162-discovery",
    participants: ["person-anika-patel", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
];

export const patelHarborEventGroundTruth: OperationalEventGroundTruth = {
  "clio-matter-0162-opened": [
    {
      eventId: "clio-matter-0162-opened:matter-status-recorded",
      matterId: "matter-2026-0162",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-08-18T09:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      semantics: {
        recordedStatus: "active",
      },
      evidenceExcerpt: "Matter status: Active",
    },
    {
      eventId: "clio-matter-0162-opened:responsibility-recorded",
      matterId: "matter-2026-0162",
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-08-18T09:00:00Z",
      actor: null,
      action: "Recorded Priya Nair as the responsible attorney.",
      object: "Responsible attorney",
      semantics: {
        assignedPerson: "Priya Nair",
      },
      evidenceExcerpt: "Responsible attorney: Priya Nair",
    },
  ],
  "email-0162-revised-contract": [
    {
      eventId: "email-0162-revised-contract:document-sent",
      matterId: "matter-2026-0162",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-08-20T14:00:00Z",
      actor: "Opposing counsel",
      action: "Sent a revised contract to the matter team.",
      object: "Revised contract",
      semantics: {
        documentForm: "revised",
        documentSubject: "contract",
      },
      evidenceExcerpt:
        "Attached is the revised contract incorporating last week's discussion.",
    },
  ],
  "email-0162-approval-request": [
    {
      eventId: "email-0162-approval-request:approval-requested",
      matterId: "matter-2026-0162",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-08-22T16:00:00Z",
      actor: "Priya Nair",
      action: "Requested Anika Patel's approval before responding.",
      object: "Revised contract",
      semantics: {
        approvalKind: "client_approval",
      },
      evidenceExcerpt: "I would like your approval before I respond",
    },
  ],
  "email-0162-hearing-set": [
    {
      eventId: "email-0162-hearing-set:schedule-status-reported",
      matterId: "matter-2026-0162",
      eventType: "SCHEDULE_STATUS_REPORTED",
      occurredAt: "2026-09-01T10:00:00Z",
      actor: "Rachel Morgan",
      action: "Reported that the motion hearing was scheduled for 2026-09-20.",
      object: "Motion hearing",
      semantics: {
        scheduledDate: "2026-09-20",
      },
      evidenceExcerpt: "The motion hearing is scheduled for 2026-09-20.",
    },
  ],
  "clio-matter-0162-closed": [
    {
      eventId: "clio-matter-0162-closed:matter-status-recorded",
      matterId: "matter-2026-0162",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-08T09:00:00Z",
      actor: null,
      action: "Recorded the matter status as Closed.",
      object: "Matter status",
      semantics: {
        recordedStatus: "closed",
      },
      evidenceExcerpt: "Matter status: Closed",
    },
  ],
  "clio-matter-0162-reopened": [
    {
      eventId: "clio-matter-0162-reopened:matter-status-recorded",
      matterId: "matter-2026-0162",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-12T09:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active after re-opening.",
      object: "Matter status",
      semantics: {
        recordedStatus: "active",
      },
      evidenceExcerpt: "Matter status: Active",
    },
  ],
  "email-0162-hearing-continued": [
    {
      eventId: "email-0162-hearing-continued:schedule-status-reported",
      matterId: "matter-2026-0162",
      eventType: "SCHEDULE_STATUS_REPORTED",
      occurredAt: "2026-09-15T11:30:00Z",
      actor: "Rachel Morgan",
      action:
        "Reported that the motion hearing was continued from 2026-09-20 to 2026-11-12.",
      object: "Motion hearing",
      semantics: {
        scheduledDate: "2026-11-12",
      },
      evidenceExcerpt:
        "The motion hearing was continued from 2026-09-20 to 2026-11-12.",
    },
  ],
  "email-0162-discovery-received": [
    {
      eventId: "email-0162-discovery-received:document-sent",
      matterId: "matter-2026-0162",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-18T13:45:00Z",
      actor: "Opposing counsel",
      action: "Sent discovery responses to the matter team.",
      object: "Discovery responses",
      semantics: {
        documentForm: "plain",
        documentSubject: "discovery",
      },
      evidenceExcerpt: "Attached are Harbor Logistics' discovery responses.",
    },
  ],
  "email-0162-waiting-client-review": [
    {
      eventId: "email-0162-waiting-client-review:waiting-state-reported",
      matterId: "matter-2026-0162",
      eventType: "WAITING_STATE_REPORTED",
      occurredAt: "2026-09-19T15:20:00Z",
      actor: "Rachel Morgan",
      action:
        "Reported that the matter team was waiting for the client's review of the discovery responses.",
      object: "the client's review of the discovery responses",
      evidenceExcerpt:
        "waiting for the client's review of the discovery responses",
    },
  ],
};

export const patelHarborCurrentState: CurrentStateGroundTruth = {
  matterId: "matter-2026-0162",
  asOf: "2026-09-22T23:59:59Z",
  expectations: [
    {
      slotId: "current-status",
      expectedState: "SUPPORTED",
      expectedValue:
        "Waiting for the client's review of the discovery responses",
      supportingEventIds: [
        "email-0162-waiting-client-review:waiting-state-reported",
      ],
      supersededEventIds: [
        "email-0162-approval-request:approval-requested",
        "clio-matter-0162-closed:matter-status-recorded",
      ],
      rationale:
        "The matter closed and then re-opened. The live wait is client review of new discovery, not the pre-close contract approval and not Closed.",
    },
    {
      slotId: "last-important-event",
      expectedState: "SUPPORTED",
      expectedValue:
        "September 19, 2026 — Rachel Morgan reported that the matter team was waiting for the client's review of the discovery responses.",
      supportingEventIds: [
        "email-0162-waiting-client-review:waiting-state-reported",
      ],
      supersededEventIds: [],
      rationale:
        "Most recent substantive event is the Sep 19 waiting-state report.",
    },
    {
      slotId: "waiting-on",
      expectedState: "SUPPORTED",
      expectedValue: "the client's review of the discovery responses",
      supportingEventIds: [
        "email-0162-waiting-client-review:waiting-state-reported",
      ],
      supersededEventIds: ["email-0162-approval-request:approval-requested"],
      rationale:
        "The later waiting-state report is the open wait. The August approval did not survive close and re-opening.",
    },
    {
      slotId: "next-action",
      expectedState: "INFERRED",
      expectedValue:
        "Review and respond after receiving the client's review of the discovery responses.",
      supportingEventIds: [
        "email-0162-waiting-client-review:waiting-state-reported",
      ],
      supersededEventIds: ["email-0162-approval-request:approval-requested"],
      rationale:
        "Next step follows the live wait for the client's discovery review, not the stale pre-close approval.",
    },
    {
      slotId: "owner",
      expectedState: "SUPPORTED",
      expectedValue: "Priya Nair",
      supportingEventIds: ["clio-matter-0162-opened:responsibility-recorded"],
      supersededEventIds: [],
      rationale:
        "The only responsibility record assigns Priya Nair. Close and re-open do not change owner.",
    },
    {
      slotId: "important-date",
      expectedState: "SUPPORTED",
      expectedValue: "November 12, 2026",
      supportingEventIds: [
        "email-0162-hearing-continued:schedule-status-reported",
      ],
      supersededEventIds: ["email-0162-hearing-set:schedule-status-reported"],
      rationale:
        "The continuance to 2026-11-12 supersedes the original 2026-09-20 hearing date. The original date is before asOf and is no longer current.",
    },
    {
      slotId: "significant-information",
      expectedState: "SUPPORTED",
      expectedValue:
        "Opposing counsel supplied discovery responses on September 18, 2026.",
      supportingEventIds: ["email-0162-discovery-received:document-sent"],
      supersededEventIds: ["email-0162-revised-contract:document-sent"],
      rationale:
        "Latest external document is the post-reopen discovery responses, not the August revised contract.",
    },
  ],
};
