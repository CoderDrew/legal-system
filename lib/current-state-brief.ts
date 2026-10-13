import type {
  EligibleEvidenceItem,
  MatterStatusBrief,
  OperationalEvent,
  StatusClaim,
  SyntheticMatter,
  SyntheticUser,
} from "@/types/mattermind";
import {
  deriveCurrentStatusSlot,
  deriveImportantDateSlot,
  deriveLastImportantEventSlot,
  deriveNextActionSlot,
  deriveOwnerSlot,
  deriveSignificantNewInformationSlot,
  deriveWaitingOnSlot,
} from "@/lib/current-state-reasoning";

/**
 * Derive all 7 Matter Status Brief slots from a matter's operational
 * events. Callers that want to test isolation should pass the combined
 * corpus event list; each deriver must ignore other matters' events.
 */
export function deriveAllCurrentStateClaims({
  events,
  matter,
  eligibleEvidence,
  requestingUser,
  asOf,
}: {
  events: OperationalEvent[];
  matter: SyntheticMatter;
  eligibleEvidence: EligibleEvidenceItem[];
  requestingUser: SyntheticUser;
  asOf: string;
}): StatusClaim[] {
  return [
    deriveCurrentStatusSlot(events, matter.id, matter, asOf),
    deriveLastImportantEventSlot(events, matter.id, matter),
    deriveWaitingOnSlot(events, matter.id, matter, eligibleEvidence),
    deriveNextActionSlot(
      events,
      matter.id,
      matter,
      eligibleEvidence,
      requestingUser,
      asOf,
    ),
    deriveOwnerSlot(events, matter.id, matter, requestingUser, asOf),
    deriveImportantDateSlot(events, matter.id, asOf),
    deriveSignificantNewInformationSlot(
      events,
      matter.id,
      matter,
      eligibleEvidence,
      requestingUser,
      asOf,
    ),
  ];
}

export function reconstructMatterStatusBrief({
  matter,
  events,
  eligibleEvidence,
  requestingUser,
  asOf,
}: {
  matter: SyntheticMatter;
  events: OperationalEvent[];
  eligibleEvidence: EligibleEvidenceItem[];
  requestingUser: SyntheticUser;
  asOf: string;
}): MatterStatusBrief {
  return {
    matter,
    claims: deriveAllCurrentStateClaims({
      events,
      matter,
      eligibleEvidence,
      requestingUser,
      asOf,
    }),
    retrievalScope: {
      sourcesSearched: ["Clio", "Outlook"],
      retrievalMode: "Synthetic V1 dataset",
      matterIsolation: matter.matterNumber,
      request: "Current matter status",
    },
  };
}
