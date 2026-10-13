/**
 * Adversarial class: cross-matter contamination (also stresses
 * ambiguous identities via the Al / Alan Smith name collision).
 *
 * Client is Al Smith, a different person from Alan Smith on
 * matter-2026-0163. Same responsible attorney Dana Okonkwo. Events
 * include a clear opposing-counsel production, a December 1 hearing,
 * and a client-approval request to al.smith@example.com.
 *
 * If matter isolation fails, 0163 would pick up this hearing date,
 * opposing-counsel document, and client-approval wait.
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

export const alSmithVendorMatter: SyntheticMatter = {
  id: "matter-2026-0164",
  matterNumber: "2026-0164",
  name: "Al Smith Vendor Review",
  client: "Al Smith",
  responsibleAttorney: "Dana Okonkwo",
  status: "Active",
  participantIds: [
    "person-al-smith",
    "user-rachel-morgan",
    "person-dana-okonkwo",
    "person-vendor-counsel",
  ],
};

const rachel = ["user-rachel-morgan"];

export const alSmithVendorEvidence: SyntheticEvidenceItem[] = [
  {
    id: "clio-matter-0164",
    sourceSystem: "Clio",
    artifactType: "Matter record",
    timestamp: "2026-09-11T10:00:00Z",
    content:
      "Matter status: Active\nResponsible attorney: Dana Okonkwo\nClient: Al Smith",
    explicitMatterId: "matter-2026-0164",
    explicitMatterNumber: "2026-0164",
    participants: ["person-al-smith", "user-rachel-morgan", "person-dana-okonkwo"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0164-opposing-production",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-16T19:00:00Z",
    from: "vendor.counsel@example.com",
    to: ["rachel.morgan@lawfirm.example"],
    subject: "Al Smith Vendor Review — Revised vendor terms",
    content:
      "Attached are the revised vendor terms for Al Smith's vendor file.",
    explicitMatterId: "matter-2026-0164",
    explicitMatterNumber: "2026-0164",
    threadId: "thread-0164-terms",
    participants: ["person-vendor-counsel", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0164-hearing",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-17T09:30:00Z",
    from: "rachel.morgan@lawfirm.example",
    to: ["al.smith@example.com"],
    subject: "Matter #2026-0164 — Status conference",
    content: "The status conference remains scheduled for 2026-12-01.",
    explicitMatterId: "matter-2026-0164",
    explicitMatterNumber: "2026-0164",
    threadId: "thread-0164-hearing",
    participants: ["person-al-smith", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0164-client-approval",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-18T18:30:00Z",
    from: "dana.okonkwo@lawfirm.example",
    to: ["al.smith@example.com"],
    cc: ["rachel.morgan@lawfirm.example"],
    subject: "Al Smith Vendor Review — Revised vendor terms",
    content:
      "Al, opposing counsel sent revised vendor terms. I would like your approval before I respond.",
    explicitMatterId: "matter-2026-0164",
    explicitMatterNumber: "2026-0164",
    threadId: "thread-0164-terms",
    participants: ["person-al-smith", "user-rachel-morgan", "person-dana-okonkwo"],
    authorizedUserIds: rachel,
  },
];

export const alSmithVendorEventGroundTruth: OperationalEventGroundTruth = {
  "clio-matter-0164": [
    {
      eventId: "clio-matter-0164:matter-status-recorded",
      matterId: "matter-2026-0164",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-11T10:00:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      semantics: {
        recordedStatus: "active",
      },
      evidenceExcerpt: "Matter status: Active",
    },
    {
      eventId: "clio-matter-0164:responsibility-recorded",
      matterId: "matter-2026-0164",
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-09-11T10:00:00Z",
      actor: null,
      action: "Recorded Dana Okonkwo as the responsible attorney.",
      object: "Responsible attorney",
      semantics: {
        assignedPerson: "Dana Okonkwo",
      },
      evidenceExcerpt: "Responsible attorney: Dana Okonkwo",
    },
  ],
  "email-0164-opposing-production": [
    {
      eventId: "email-0164-opposing-production:document-sent",
      matterId: "matter-2026-0164",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T19:00:00Z",
      actor: "Opposing counsel",
      action: "Sent revised vendor terms to the matter team.",
      object: "Revised vendor terms",
      semantics: {
        documentForm: "revised",
        documentSubject: "vendor",
      },
      evidenceExcerpt:
        "Attached are the revised vendor terms for Al Smith's vendor file.",
    },
  ],
  "email-0164-hearing": [
    {
      eventId: "email-0164-hearing:schedule-status-reported",
      matterId: "matter-2026-0164",
      eventType: "SCHEDULE_STATUS_REPORTED",
      occurredAt: "2026-09-17T09:30:00Z",
      actor: "Rachel Morgan",
      action:
        "Reported that the status conference remained scheduled for 2026-12-01.",
      object: "Status conference",
      semantics: {
        scheduledDate: "2026-12-01",
      },
      evidenceExcerpt:
        "The status conference remains scheduled for 2026-12-01.",
    },
  ],
  "email-0164-client-approval": [
    {
      eventId: "email-0164-client-approval:approval-requested",
      matterId: "matter-2026-0164",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-18T18:30:00Z",
      actor: "Dana Okonkwo",
      action: "Requested Al Smith's approval before responding.",
      object: "Revised vendor terms",
      semantics: {
        approvalKind: "client_approval",
      },
      evidenceExcerpt: "I would like your approval before I respond",
    },
  ],
};

export const alSmithVendorCurrentState: CurrentStateGroundTruth = {
  matterId: "matter-2026-0164",
  asOf: "2026-09-20T23:59:59Z",
  expectations: [
    {
      slotId: "current-status",
      expectedState: "SUPPORTED",
      expectedValue: "Vendor revisions are awaiting client approval.",
      supportingEventIds: [
        "email-0164-opposing-production:document-sent",
        "email-0164-client-approval:approval-requested",
      ],
      supersededEventIds: [],
      rationale:
        "Al Smith is the client on this file. Revised vendor terms are awaiting that client's approval.",
    },
    {
      slotId: "last-important-event",
      expectedState: "SUPPORTED",
      expectedValue:
        "September 18, 2026 — Attorney requested client approval of the revised vendor terms.",
      supportingEventIds: ["email-0164-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "Latest substantive event is Dana Okonkwo requesting Al Smith's approval. Dana is the responsible attorney.",
    },
    {
      slotId: "waiting-on",
      expectedState: "SUPPORTED",
      expectedValue: "Client approval",
      supportingEventIds: ["email-0164-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "The approval email is addressed to al.smith@example.com, which matches client Al Smith.",
    },
    {
      slotId: "next-action",
      expectedState: "INFERRED",
      expectedValue:
        "Respond to opposing counsel after the client makes a decision.",
      supportingEventIds: ["email-0164-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "The pending approval is of opposing counsel's revised vendor terms.",
    },
    {
      slotId: "owner",
      expectedState: "SUPPORTED",
      expectedValue: "Dana Okonkwo",
      supportingEventIds: ["clio-matter-0164:responsibility-recorded"],
      supersededEventIds: [],
      rationale:
        "Clio records Dana Okonkwo. Sharing that attorney with 0163 must not mix the two files' events.",
    },
    {
      slotId: "important-date",
      expectedState: "SUPPORTED",
      expectedValue: "December 1, 2026",
      supportingEventIds: ["email-0164-hearing:schedule-status-reported"],
      supersededEventIds: [],
      rationale:
        "Status conference is scheduled for 2026-12-01. This date must never appear on Alan Smith v. Westfield.",
    },
    {
      slotId: "significant-information",
      expectedState: "SUPPORTED",
      expectedValue:
        "Opposing counsel supplied revised vendor terms on September 16, 2026.",
      supportingEventIds: ["email-0164-opposing-production:document-sent"],
      supersededEventIds: [],
      rationale:
        "The production is from the known external role opposing counsel. 0163 has no such classifiable external document.",
    },
  ],
};
