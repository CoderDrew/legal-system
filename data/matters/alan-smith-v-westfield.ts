/**
 * Adversarial class: ambiguous identities.
 *
 * Client is Alan Smith. A different person, Al Smith, writes from
 * al.smith@example.com. An approval request is sent to the shared
 * mailbox a.smith@example.com, which is neither alan.smith nor al.smith.
 * A document arrives from the bare role label "counsel", which is not
 * a known own-side or opposing-counsel label.
 *
 * These identities must not be collapsed. Slots that depend on knowing
 * who is the client, who is opposing, or who must act are UNKNOWN.
 *
 * Pair with Al Smith Vendor Review (matter-2026-0164) for cross-matter
 * name collision. 0164 events must never fill 0163 slots.
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

export const alanSmithWestfieldMatter: SyntheticMatter = {
  id: "matter-2026-0163",
  matterNumber: "2026-0163",
  name: "Alan Smith v. Westfield",
  client: "Alan Smith",
  responsibleAttorney: "Dana Okonkwo",
  status: "Active",
  participantIds: [
    "person-alan-smith",
    "person-al-smith",
    "user-rachel-morgan",
    "person-dana-okonkwo",
    "person-westfield-counsel",
  ],
};

const rachel = ["user-rachel-morgan"];

export const alanSmithWestfieldEvidence: SyntheticEvidenceItem[] = [
  {
    id: "clio-matter-0163",
    sourceSystem: "Clio",
    artifactType: "Matter record",
    timestamp: "2026-09-10T09:30:00Z",
    content:
      "Matter status: Active\nResponsible attorney: Dana Okonkwo\nClient: Alan Smith",
    explicitMatterId: "matter-2026-0163",
    explicitMatterNumber: "2026-0163",
    participants: [
      "person-alan-smith",
      "user-rachel-morgan",
      "person-dana-okonkwo",
    ],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0163-from-al-smith",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-16T11:15:00Z",
    from: "al.smith@example.com",
    to: ["rachel.morgan@lawfirm.example"],
    cc: ["a.smith@example.com"],
    subject: "Alan Smith v. Westfield — Documents from Al",
    content:
      "Rachel, I gathered the witness outline we discussed. This is Al Smith, not Alan.",
    explicitMatterId: "matter-2026-0163",
    explicitMatterNumber: "2026-0163",
    threadId: "thread-0163-al",
    participants: ["person-al-smith", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0163-counsel-document",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-17T13:00:00Z",
    from: "counsel@westfield.example",
    to: ["rachel.morgan@lawfirm.example"],
    subject: "Alan Smith v. Westfield — Position letter",
    content: "Attached is our position letter for the Alan Smith matter.",
    explicitMatterId: "matter-2026-0163",
    explicitMatterNumber: "2026-0163",
    threadId: "thread-0163-counsel",
    participants: ["person-westfield-counsel", "user-rachel-morgan"],
    authorizedUserIds: rachel,
  },
  {
    id: "email-0163-approval-ambiguous-address",
    sourceSystem: "Outlook",
    artifactType: "Email",
    timestamp: "2026-09-18T16:45:00Z",
    from: "dana.okonkwo@lawfirm.example",
    to: ["a.smith@example.com"],
    cc: ["rachel.morgan@lawfirm.example"],
    subject: "Alan Smith v. Westfield — Need a decision",
    content:
      "Please let me know whether you approve the outline before I respond. I am copying the shared Smith mailbox because I cannot tell whether this should go to Alan or Al.",
    explicitMatterId: "matter-2026-0163",
    explicitMatterNumber: "2026-0163",
    threadId: "thread-0163-al",
    participants: [
      "person-alan-smith",
      "person-al-smith",
      "user-rachel-morgan",
      "person-dana-okonkwo",
    ],
    authorizedUserIds: rachel,
  },
];

export const alanSmithWestfieldEventGroundTruth: OperationalEventGroundTruth = {
  "clio-matter-0163": [
    {
      eventId: "clio-matter-0163:matter-status-recorded",
      matterId: "matter-2026-0163",
      eventType: "MATTER_STATUS_RECORDED",
      occurredAt: "2026-09-10T09:30:00Z",
      actor: null,
      action: "Recorded the matter status as Active.",
      object: "Matter status",
      semantics: {
        recordedStatus: "active",
      },
      evidenceExcerpt: "Matter status: Active",
    },
    {
      eventId: "clio-matter-0163:responsibility-recorded",
      matterId: "matter-2026-0163",
      eventType: "RESPONSIBILITY_RECORDED",
      occurredAt: "2026-09-10T09:30:00Z",
      actor: null,
      action: "Recorded Dana Okonkwo as the responsible attorney.",
      object: "Responsible attorney",
      semantics: {
        assignedPerson: "Dana Okonkwo",
      },
      evidenceExcerpt: "Responsible attorney: Dana Okonkwo",
    },
  ],
  "email-0163-from-al-smith": [
    {
      eventId: "email-0163-from-al-smith:document-sent",
      matterId: "matter-2026-0163",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-16T11:15:00Z",
      actor: "Al Smith",
      action: "Sent a witness outline to the matter team.",
      object: "Witness outline",
      semantics: {
        documentForm: "plain",
        documentSubject: "outline",
      },
      evidenceExcerpt: "I gathered the witness outline we discussed",
    },
  ],
  "email-0163-counsel-document": [
    {
      eventId: "email-0163-counsel-document:document-sent",
      matterId: "matter-2026-0163",
      eventType: "DOCUMENT_SENT",
      occurredAt: "2026-09-17T13:00:00Z",
      actor: "counsel",
      action: "Sent a position letter to the matter team.",
      object: "Position letter",
      semantics: {
        documentForm: "plain",
        documentSubject: "letter",
      },
      evidenceExcerpt: "Attached is our position letter for the Alan Smith matter.",
    },
  ],
  "email-0163-approval-ambiguous-address": [
    {
      eventId: "email-0163-approval-ambiguous-address:approval-requested",
      matterId: "matter-2026-0163",
      eventType: "APPROVAL_REQUESTED",
      occurredAt: "2026-09-18T16:45:00Z",
      actor: "Dana Okonkwo",
      action: "Requested approval of the outline from the shared Smith mailbox.",
      object: "Witness outline",
      evidenceExcerpt:
        "whether you approve the outline before I respond",
    },
  ],
};

export const alanSmithWestfieldCurrentState: CurrentStateGroundTruth = {
  matterId: "matter-2026-0163",
  asOf: "2026-09-20T23:59:59Z",
  expectations: [
    {
      slotId: "current-status",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "An approval was requested from a shared mailbox that is not the client's address, and approvalKind is omitted because the approver is not known. Current operational status cannot be stated confidently.",
    },
    {
      slotId: "last-important-event",
      expectedState: "SUPPORTED",
      expectedValue:
        "September 18, 2026 — Attorney requested approval of the outline from the shared Smith mailbox.",
      supportingEventIds: [
        "email-0163-approval-ambiguous-address:approval-requested",
      ],
      supersededEventIds: [],
      rationale:
        "The latest substantive event is Dana Okonkwo's approval request. Dana is the responsible attorney, so the actor displays as Attorney. The request is not a client-approval template because approvalKind is omitted.",
    },
    {
      slotId: "waiting-on",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "The approval email is addressed to a.smith@example.com, which does not match Alan Smith, and approvalKind is omitted. Who the file is waiting on is unknown.",
    },
    {
      slotId: "next-action",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "The file cannot confidently say 'respond to Al Smith' or 'wait for the client'. Al is not the client; 'counsel' is not a resolved side; the shared mailbox is not a structured recipient.",
    },
    {
      slotId: "owner",
      expectedState: "SUPPORTED",
      expectedValue: "Dana Okonkwo",
      supportingEventIds: ["clio-matter-0163:responsibility-recorded"],
      supersededEventIds: [],
      rationale: "Clio records Dana Okonkwo as the current assignee.",
    },
    {
      slotId: "important-date",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "No schedule event exists on this matter. A date on Al Smith Vendor Review must not appear here.",
    },
    {
      slotId: "significant-information",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "Al Smith is not the client and is not a known external role. The actor 'counsel' is not 'opposing counsel'. Neither document is classifiable as significant external information.",
    },
  ],
};
