import type { CurrentStateGroundTruth } from "@/types/mattermind";

export const syntheticCurrentStateGroundTruth: CurrentStateGroundTruth = {
  matterId: "matter-2026-0142",
  asOf: "2026-09-17T23:59:59Z",
  expectations: [
    {
      slotId: "current-status",
      expectedState: "SUPPORTED",
      expectedValue: "Settlement revisions are awaiting client approval.",
      supportingEventIds: [
        "email-0142-revised-language:document-sent",
        "email-0142-client-approval:approval-requested",
      ],
      supersededEventIds: ["email-0142-waiting-on-counsel:waiting-state-reported"],
      rationale:
        "Revised language received (Sep 16), approval requested (Sep 17), no response yet. Earlier waiting-on-counsel state superseded.",
    },
    {
      slotId: "last-important-event",
      expectedState: "SUPPORTED",
      expectedValue:
        "September 17, 2026 — Attorney requested client approval of the revised settlement language.",
      supportingEventIds: ["email-0142-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "Most recent substantive operational event is the approval request on Sep 17.",
    },
    {
      slotId: "waiting-on",
      expectedState: "SUPPORTED",
      expectedValue: "Client approval",
      supportingEventIds: ["email-0142-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "Approval explicitly requested on Sep 17 and not yet received as of cutoff.",
    },
    {
      slotId: "next-action",
      expectedState: "INFERRED",
      expectedValue: "Respond to opposing counsel after the client makes a decision.",
      supportingEventIds: ["email-0142-client-approval:approval-requested"],
      supersededEventIds: [],
      rationale:
        "Next action is inferred from the pending approval request: response to opposing counsel logically follows client decision.",
    },
    {
      slotId: "owner",
      expectedState: "SUPPORTED",
      expectedValue: "Alex Thompson",
      supportingEventIds: ["clio-matter-0142:responsibility-recorded"],
      supersededEventIds: [],
      rationale:
        "Clio matter record explicitly identifies Alex Thompson as responsible attorney.",
    },
    {
      slotId: "important-date",
      expectedState: "UNKNOWN",
      expectedValue: null,
      supportingEventIds: [],
      supersededEventIds: [],
      rationale:
        "The Sep 10 email says 'next month' (relative phrasing, not a date). No other event establishes a specific deadline.",
    },
    {
      slotId: "significant-information",
      expectedState: "SUPPORTED",
      expectedValue:
        "Opposing counsel supplied revised settlement language on September 16, 2026.",
      supportingEventIds: ["email-0142-revised-language:document-sent"],
      supersededEventIds: [],
      rationale:
        "Document-sent event from opposing counsel on Sep 16 is the most significant new information.",
    },
  ],
};
