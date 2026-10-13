import {
  DEFAULT_MATTER_ID,
  getCorpusCase,
  syntheticCorpusCases,
} from "@/data/synthetic-corpus";
import {
  syntheticEvidenceUniverse,
  syntheticOperationalEventGroundTruth,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import { reconstructMatterStatusBrief } from "@/lib/current-state-brief";
import { buildEligibleEvidenceSet } from "@/lib/evidence-processing";
import { extractOperationalEvents } from "@/lib/operational-events";
import type { SyntheticCorpusCase } from "@/types/mattermind";

export function selectableCorpusMatters(): SyntheticCorpusCase["matter"][] {
  return syntheticCorpusCases.map((entry) => entry.matter);
}

export function reconstructSelectedMatter(matterId: string = DEFAULT_MATTER_ID) {
  const entry = getCorpusCase(matterId);
  const processed = buildEligibleEvidenceSet({
    user: syntheticRequestingUser,
    selectedMatter: entry.matter,
    evidenceUniverse: syntheticEvidenceUniverse,
  });
  const events = extractOperationalEvents({
    eligibleEvidence: processed.eligibleEvidence,
    groundTruth: syntheticOperationalEventGroundTruth,
    matterId: entry.matter.id,
  });

  return {
    entry,
    processed,
    events,
    brief: reconstructMatterStatusBrief({
      matter: entry.matter,
      events,
      eligibleEvidence: processed.eligibleEvidence,
      requestingUser: syntheticRequestingUser,
      asOf: entry.currentState.asOf,
    }),
  };
}
