import { syntheticCurrentStateGroundTruth } from "@/data/synthetic-current-state";
import { alSmithVendorCurrentState } from "@/data/matters/al-smith-vendor-review";
import { alanSmithWestfieldCurrentState } from "@/data/matters/alan-smith-v-westfield";
import { chenEmploymentCurrentState } from "@/data/matters/chen-employment-file";
import { patelHarborCurrentState } from "@/data/matters/patel-v-harbor";
import { riveraNorthwindCurrentState } from "@/data/matters/rivera-v-northwind";
import { smithPropertyCurrentState } from "@/data/matters/smith-property-acquisition";
import {
  syntheticEvidenceUniverse,
  syntheticMatters,
  syntheticOperationalEventGroundTruth,
} from "@/data/synthetic-matter";
import type {
  AdversarialClass,
  CurrentStateGroundTruth,
  OperationalEventGroundTruth,
  SyntheticCorpusCase,
  SyntheticEvidenceItem,
  SyntheticMatter,
} from "@/types/mattermind";

export const DEFAULT_MATTER_ID = "matter-2026-0142";

const CURRENT_STATE_BY_MATTER_ID: Record<string, CurrentStateGroundTruth> = {
  "matter-2026-0142": syntheticCurrentStateGroundTruth,
  "matter-2026-0159": smithPropertyCurrentState,
  "matter-2026-0160": chenEmploymentCurrentState,
  "matter-2026-0161": riveraNorthwindCurrentState,
  "matter-2026-0162": patelHarborCurrentState,
  "matter-2026-0163": alanSmithWestfieldCurrentState,
  "matter-2026-0164": alSmithVendorCurrentState,
};

const CLASS_BY_MATTER_ID: Record<string, AdversarialClass> = {
  "matter-2026-0142": "baseline",
  "matter-2026-0159": "cross-matter-contamination",
  "matter-2026-0160": "missing-evidence",
  "matter-2026-0161": "conflicting-evidence",
  "matter-2026-0162": "stale-evidence",
  "matter-2026-0163": "ambiguous-identities",
  "matter-2026-0164": "cross-matter-contamination",
};

const INTENT_BY_MATTER_ID: Record<string, string> = {
  "matter-2026-0142":
    "Baseline Smith v. Acme reconstruction. Unchanged default matter.",
  "matter-2026-0159":
    "Cross-matter contamination with Smith v. Acme: shared client Jordan Smith, shared attorney, and later same-day events that would change 0142's date, last event, status, and significant information if isolation failed.",
  "matter-2026-0160":
    "Missing evidence: assignee, calendar date, wait, next action, external document, and operational current status are absent, so those slots are UNKNOWN.",
  "matter-2026-0161":
    "Conflicting evidence: two same-timestamp sources disagree on owner and on hearing date. Those slots are CONFLICTING.",
  "matter-2026-0162":
    "Stale evidence: the matter closed, then re-opened, and the hearing was continued. Pre-close approval and the September 20 hearing are stale.",
  "matter-2026-0163":
    "Ambiguous identities: Alan vs Al Smith, shared a.smith@ mailbox, and a bare 'counsel' role label. Identity-dependent slots are UNKNOWN.",
  "matter-2026-0164":
    "Cross-matter contamination with Alan Smith v. Westfield: same attorney Dana Okonkwo and similar Smith names. December 1 hearing and opposing-counsel production must never fill 0163.",
};

function evidenceForMatter(
  universe: readonly SyntheticEvidenceItem[],
  matter: SyntheticMatter,
): SyntheticEvidenceItem[] {
  return universe.filter(
    (item) =>
      item.explicitMatterId === matter.id ||
      item.explicitMatterNumber === matter.matterNumber,
  );
}

function eventsForMatter(
  groundTruth: OperationalEventGroundTruth,
  matterId: string,
): OperationalEventGroundTruth {
  return Object.fromEntries(
    Object.entries(groundTruth).filter(([, events]) =>
      events.some((event) => event.matterId === matterId),
    ),
  );
}

export function buildSyntheticCorpusCases(
  matters: readonly SyntheticMatter[] = syntheticMatters,
  evidenceUniverse: readonly SyntheticEvidenceItem[] = syntheticEvidenceUniverse,
  eventGroundTruth: OperationalEventGroundTruth = syntheticOperationalEventGroundTruth,
): SyntheticCorpusCase[] {
  return matters.map((matter) => {
    const currentState = CURRENT_STATE_BY_MATTER_ID[matter.id];
    const adversarialClass = CLASS_BY_MATTER_ID[matter.id];
    const intent = INTENT_BY_MATTER_ID[matter.id];
    if (!currentState || !adversarialClass || !intent) {
      throw new Error(`Synthetic corpus is missing metadata for ${matter.id}.`);
    }

    return {
      adversarialClass,
      intent,
      matter,
      evidence: evidenceForMatter(evidenceUniverse, matter),
      eventGroundTruth: eventsForMatter(eventGroundTruth, matter.id),
      currentState,
    };
  });
}

export function getCorpusCase(
  matterId: string,
  cases: readonly SyntheticCorpusCase[] = syntheticCorpusCases,
): SyntheticCorpusCase {
  const found = cases.find((entry) => entry.matter.id === matterId);
  if (!found) {
    throw new Error(`No synthetic corpus case for matter ${matterId}.`);
  }
  return found;
}

export const syntheticCorpusCases: SyntheticCorpusCase[] =
  buildSyntheticCorpusCases();
