/**
 * Adversarial class: cross-matter contamination.
 *
 * Shares client Jordan Smith, requesting user Rachel Morgan, and the
 * "Smith" caption with Smith v. Acme (matter-2026-0142). Events sit
 * inside 0142's asOf window and would change 0142's important-date,
 * significant-information, last-important-event, and current-status if
 * reasoners failed to filter by matterId.
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

export const smithPropertyMatter: SyntheticMatter = {
  id: "matter-2026-0159",
  matterNumber: "2026-0159",
  name: "Smith Property Acquisition",
  client: "Jordan Smith",
  responsibleAttorney: "Alex Thompson",
  status: "Active",
  participantIds: [
    "person-jordan-smith",
    "user-rachel-morgan",
    "person-property-seller",
  ],
};

const rachel = ["user-rachel-morgan"];

export const smithPropertyAdditionalEvidence: SyntheticEvidenceItem[] = [
  {
    id: "email-0159-revised-purchase",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-16T18:00:00Z",
    from: "seller.counsel@example.com",
    to: ["rachel.morgan@lawfirm.example"],
    subject: "Smith Property Acquisition — Revised purchase terms",
    content:
      "Attached are the revised purchase terms for the Smith property acquisition. Please review with your client.",
    explicitMatterId: "matter-2026-0159",
    explicitMatterNumber: "2026-0159",
    threadId: "thread-0159-purchase",
    participants: ["person-property-seller", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0159-closing-schedule",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-17T12:00:00Z",
    from: "rachel.morgan@lawfirm.example",
    to: ["jordan.smith@example.com"],
    subject: "Matter #2026-0159 — Closing date",
    content: "The closing remains scheduled for 2026-10-30.",
    explicitMatterId: "matter-2026-0159",
    explicitMatterNumber: "2026-0159",
    threadId: "thread-0159-closing",
    participants: ["person-jordan-smith", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0159-client-approval",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-17T18:00:00Z",
    from: "alex.thompson@lawfirm.example",
    to: ["jordan.smith@example.com"],
    cc: ["rachel.morgan@lawfirm.example"],
    subject: "Smith Property Acquisition — Revised purchase agreement",
    content:
      "Jordan, opposing counsel sent revised purchase terms this afternoon. I would like your approval before I respond.",
    explicitMatterId: "matter-2026-0159",
    explicitMatterNumber: "2026-0159",
    threadId: "thread-0159-purchase",
    participants: ["person-jordan-smith", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
];

export const smithPropertyEventGroundTruth: OperationalEventGroundTruth = {
  "clio-matter-0159": [
    {
      eventId: "clio-matter-0159:matter-status-recorded",
      matterId: "matter-2026-0159",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-17T09:05:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      semantics: {
        recordedStatus: "active",
      },
      evidenceExcerpt: "Matter status: Active",
    },
    {
      eventId: "clio-matter-0159:responsibility-recorded",
      matterId: "matter-2026-0159",
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-09-17T09:05:00Z",
      actor: null,
      action: "Recorded Alex Thompson as the responsible attorney.",
      object: "Responsible attorney",
      semantics: {
        assignedPerson: "Alex Thompson",
      },
      evidenceExcerpt: "Responsible attorney: Alex Thompson",
    },
  ],
  "email-0159-inspection": [
    {
      eventId: "email-0159-inspection:document-sent",
      matterId: "matter-2026-0159",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-11T18:00:00Z",
      actor: "third party",
      action: "Sent inspection materials for the Smith property acquisition.",
      object: "Inspection materials",
      semantics: {
        documentForm: "plain",
        documentSubject: "inspection",
      },
      evidenceExcerpt: "inspection materials for the Smith property acquisition",
    },
  ],
  "email-0159-revised-purchase": [
    {
      eventId: "email-0159-revised-purchase:document-sent",
      matterId: "matter-2026-0159",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T18:00:00Z",
      actor: "Opposing counsel",
      action: "Sent revised purchase terms to the matter team.",
      object: "Revised purchase terms",
      semantics: {
        documentForm: "revised",
        documentSubject: "purchase",
      },
      evidenceExcerpt:
        "Attached are the revised purchase terms for the Smith property acquisition.",
    },
  ],
  "email-0159-closing-schedule": [
    {
      eventId: "email-0159-closing-schedule:schedule-status-reported",
      matterId: "matter-2026-0159",
      eventType: "SCHEDULE_STATUS_REPORTED",
      occurredAt: "2026-09-17T12:00:00Z",
      actor: "Rachel Morgan",
      action: "Reported that the closing remained scheduled for 2026-10-30.",
      object: "Closing",
      semantics: {
        scheduledDate: "2026-10-30",
      },
      evidenceExcerpt: "The closing remains scheduled for 2026-10-30.",
    },
  ],
  "email-0159-client-approval": [
    {
      eventId: "email-0159-client-approval:approval-requested",
      matterId: "matter-2026-0159",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-17T18:00:00Z",
      actor: "Alex Thompson",
      action: "Requested Jordan Smith's approval before responding.",
      object: "Revised purchase terms",
      semantics: {
        approvalKind: "client_approval",
      },
      evidenceExcerpt: "I would like your approval before I respond",
    },
  ],
};

export const smithPropertyCurrentState: CurrentStateGroundTruth = {
  matterId: "matter-2026-0159",
  asOf: "2026-09-17T23:59:59Z",
  expectations: [
    {
      slotId: "current-status",
      expectedState: "SUPPORTED",
      expectedValue: "Purchase revisions are awaiting client approval.",
      supportingEventIds: [
        "email-0159-revised-purchase:document-sent",
        "email-0159-client-approval:approval-requested",
      ],
      supersededEventIds: ["email-0159-inspection:document-sent"],
      rationale:
        "Latest live work is client approval of the revised purchase terms. Earlier inspection materials are historical.",
    },
    {
      slotId: "last-important-event",
      expectedState: "SUPPORTED",
      expectedValue:
        "September 17, 2026 — Attorney requested client approval of the revised purchase terms.",
      supportingEventIds: ["email-0159-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "Most recent substantive event is the Sep 17 18:00 approval request, later than 0142's Sep 17 17:45 request.",
    },
    {
      slotId: "waiting-on",
      expectedState: "SUPPORTED",
      expectedValue: "Client approval",
      supportingEventIds: ["email-0159-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "Approval was emailed to Jordan Smith and has not been received.",
    },
    {
      slotId: "next-action",
      expectedState: "INFERRED",
      expectedValue:
        "Respond to opposing counsel after the client makes a decision.",
      supportingEventIds: ["email-0159-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "The pending approval is of a document sent by opposing counsel, so the next step is to respond after the client decides.",
    },
    {
      slotId: "owner",
      expectedState: "SUPPORTED",
      expectedValue: "Alex Thompson",
      supportingEventIds: ["clio-matter-0159:responsibility-recorded"],
      supersededEventIds: [],
      rationale:
        "Clio records Alex Thompson as the current assignee. This must not leak into or out of 0142 even though both files share that attorney.",
    },
    {
      slotId: "important-date",
      expectedState: "SUPPORTED",
      expectedValue: "October 30, 2026",
      supportingEventIds: [
        "email-0159-closing-schedule:schedule-status-reported",
      ],
      supersededEventIds: [],
      rationale:
        "Closing is explicitly scheduled for 2026-10-30. Smith v. Acme has no current date; this date must never appear on 0142.",
    },
    {
      slotId: "significant-information",
      expectedState: "SUPPORTED",
      expectedValue:
        "Opposing counsel supplied revised purchase terms on September 16, 2026.",
      supportingEventIds: ["email-0159-revised-purchase:document-sent"],
      supersededEventIds: ["email-0159-inspection:document-sent"],
      rationale:
        "Latest external document is the revised purchase terms on Sep 16 at 18:00, after 0142's settlement language at 14:20. Isolation requires 0142 to keep the settlement language.",
    },
  ],
};
