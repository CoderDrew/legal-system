import { reconstructMatterStatusBrief } from "@/lib/current-state-brief";
import { buildEligibleEvidenceSet } from "@/lib/evidence-processing";
import { extractOperationalEvents } from "@/lib/operational-events";
import type {
  CorpusScorecard,
  CorpusSlotOutcome,
  CorpusSlotScore,
  CurrentStateExpectation,
  EligibleEvidenceItem,
  EvidenceState,
  OperationalEvent,
  StatusClaim,
  SyntheticCorpusCase,
  SyntheticUser,
} from "@/types/mattermind";
import { BRIEF_SLOT_IDS } from "@/types/mattermind";

const UNKNOWN_DISPLAY_VALUE = "Unknown";

export type CorpusEvaluationInput = {
  cases: readonly SyntheticCorpusCase[];
  requestingUser: SyntheticUser;
  evidenceUniverse: Parameters<typeof buildEligibleEvidenceSet>[0]["evidenceUniverse"];
  eventGroundTruth: Parameters<typeof extractOperationalEvents>[0]["groundTruth"];
};

function displayValue(
  state: EvidenceState,
  value: string | null,
): string {
  if (state === "UNKNOWN" || state === "CONFLICTING") {
    return value ?? UNKNOWN_DISPLAY_VALUE;
  }
  return value ?? UNKNOWN_DISPLAY_VALUE;
}

function valuesMatch(
  expected: CurrentStateExpectation,
  actual: StatusClaim,
): boolean {
  return (
    displayValue(expected.expectedState, expected.expectedValue) ===
    actual.value
  );
}

function classifySlot(
  expected: CurrentStateExpectation,
  actual: StatusClaim,
): CorpusSlotOutcome {
  const valueOk = valuesMatch(expected, actual);
  const stateOk = expected.expectedState === actual.state;

  if (expected.expectedState === "UNKNOWN" && actual.state === "UNKNOWN") {
    return "correctly_unknown";
  }
  if (valueOk && stateOk) {
    return "correct";
  }
  if (valueOk) {
    return "state_mismatch";
  }
  if (actual.state === "SUPPORTED" || actual.state === "INFERRED") {
    return "wrong_confident";
  }
  if (actual.state === "UNKNOWN") {
    return "false_unknown";
  }
  return "state_mismatch";
}

function isWrongConfident(outcome: CorpusSlotOutcome): boolean {
  return outcome === "wrong_confident";
}

function artifactIdsForMatter(
  events: readonly OperationalEvent[],
  matterId: string,
): Set<string> {
  return new Set(
    events
      .filter((event) => event.matterId === matterId)
      .map((event) => event.provenance.sourceArtifactId),
  );
}

export function extractAllCorpusEvents({
  cases,
  requestingUser,
  evidenceUniverse,
  eventGroundTruth,
}: CorpusEvaluationInput): {
  allEvents: OperationalEvent[];
  allEligibleEvidence: EligibleEvidenceItem[];
  eventsByMatter: Map<string, OperationalEvent[]>;
} {
  const allEvents: OperationalEvent[] = [];
  const allEligibleEvidence: EligibleEvidenceItem[] = [];
  const eventsByMatter = new Map<string, OperationalEvent[]>();

  for (const entry of cases) {
    const processed = buildEligibleEvidenceSet({
      user: requestingUser,
      selectedMatter: entry.matter,
      evidenceUniverse,
    });
    const events = extractOperationalEvents({
      eligibleEvidence: processed.eligibleEvidence,
      groundTruth: eventGroundTruth,
      matterId: entry.matter.id,
    });
    eventsByMatter.set(entry.matter.id, events);
    allEvents.push(...events);
    allEligibleEvidence.push(...processed.eligibleEvidence);
  }

  return { allEvents, allEligibleEvidence, eventsByMatter };
}

export function evaluateCorpus(
  input: CorpusEvaluationInput,
): CorpusScorecard {
  const { allEvents, allEligibleEvidence } = extractAllCorpusEvents(input);
  const slots: CorpusSlotScore[] = [];

  for (const entry of input.cases) {
    const brief = reconstructMatterStatusBrief({
      matter: entry.matter,
      events: allEvents,
      eligibleEvidence: allEligibleEvidence,
      requestingUser: input.requestingUser,
      asOf: entry.currentState.asOf,
    });
    const ownArtifactIds = artifactIdsForMatter(allEvents, entry.matter.id);

    for (const slotId of BRIEF_SLOT_IDS) {
      const expected = entry.currentState.expectations.find(
        (item) => item.slotId === slotId,
      );
      const actual = brief.claims.find((claim) => claim.id === slotId);
      if (!expected || !actual) {
        throw new Error(
          `Corpus evaluation missing ${slotId} for ${entry.matter.id}.`,
        );
      }

      const outcome = classifySlot(expected, actual);
      const isolationLeak = actual.evidenceIds.some(
        (evidenceId) => !ownArtifactIds.has(evidenceId),
      );

      slots.push({
        matterId: entry.matter.id,
        matterName: entry.matter.name,
        adversarialClass: entry.adversarialClass,
        slotId,
        expectedState: expected.expectedState,
        expectedValue: expected.expectedValue,
        actualState: actual.state,
        actualValue: actual.value,
        outcome,
        wrongConfident: isWrongConfident(outcome),
        isolationLeak,
        rationale: expected.rationale,
      });
    }
  }

  const byMatter = input.cases.map((entry) => {
    const matterSlots = slots.filter(
      (slot) => slot.matterId === entry.matter.id,
    );
    return {
      matterId: entry.matter.id,
      matterName: entry.matter.name,
      adversarialClass: entry.adversarialClass,
      correct: matterSlots.filter(
        (slot) =>
          slot.outcome === "correct" || slot.outcome === "correctly_unknown",
      ).length,
      wrongConfident: matterSlots.filter((slot) => slot.wrongConfident).length,
      correctlyUnknown: matterSlots.filter(
        (slot) => slot.outcome === "correctly_unknown",
      ).length,
    };
  });

  const bySlot = BRIEF_SLOT_IDS.map((slotId) => {
    const slotRows = slots.filter((slot) => slot.slotId === slotId);
    return {
      slotId,
      correct: slotRows.filter(
        (slot) =>
          slot.outcome === "correct" || slot.outcome === "correctly_unknown",
      ).length,
      wrongConfident: slotRows.filter((slot) => slot.wrongConfident).length,
      correctlyUnknown: slotRows.filter(
        (slot) => slot.outcome === "correctly_unknown",
      ).length,
    };
  });

  return {
    matterCount: input.cases.length,
    slotCount: slots.length,
    correct: slots.filter(
      (slot) =>
        slot.outcome === "correct" || slot.outcome === "correctly_unknown",
    ).length,
    wrongConfident: slots.filter((slot) => slot.wrongConfident).length,
    correctlyUnknown: slots.filter(
      (slot) => slot.outcome === "correctly_unknown",
    ).length,
    falseUnknown: slots.filter((slot) => slot.outcome === "false_unknown")
      .length,
    stateMismatch: slots.filter((slot) => slot.outcome === "state_mismatch")
      .length,
    isolationLeaks: slots.filter((slot) => slot.isolationLeak).length,
    byMatter,
    bySlot,
    slots,
  };
}

export function formatCorpusScorecard(scorecard: CorpusScorecard): string {
  const header = [
    `Matters: ${scorecard.matterCount}`,
    `Slots evaluated: ${scorecard.slotCount}`,
    `Correct: ${scorecard.correct}`,
    `Wrong-confident: ${scorecard.wrongConfident}`,
    `Correctly UNKNOWN: ${scorecard.correctlyUnknown}`,
    `False UNKNOWN: ${scorecard.falseUnknown}`,
    `State mismatch: ${scorecard.stateMismatch}`,
    `Isolation leaks: ${scorecard.isolationLeaks}`,
  ].join("\n");

  const matterLines = [
    "",
    "By matter:",
    ...scorecard.byMatter.map(
      (row) =>
        `  ${row.matterName} (${row.adversarialClass}): correct ${row.correct}/7, wrong-confident ${row.wrongConfident}, correctly UNKNOWN ${row.correctlyUnknown}`,
    ),
  ];

  const slotLines = [
    "",
    "By slot:",
    ...scorecard.bySlot.map(
      (row) =>
        `  ${row.slotId}: correct ${row.correct}/${scorecard.matterCount}, wrong-confident ${row.wrongConfident}, correctly UNKNOWN ${row.correctlyUnknown}`,
    ),
  ];

  const mismatches = scorecard.slots.filter(
    (slot) =>
      slot.outcome !== "correct" && slot.outcome !== "correctly_unknown",
  );
  const mismatchLines = [
    "",
    "Mismatches:",
    ...(mismatches.length === 0
      ? ["  none"]
      : mismatches.map(
          (slot) =>
            `  ${slot.matterName} / ${slot.slotId}: expected ${slot.expectedState} ${JSON.stringify(slot.expectedValue)} actual ${slot.actualState} ${JSON.stringify(slot.actualValue)} (${slot.outcome}${slot.isolationLeak ? ", isolation leak" : ""})`,
        )),
  ];

  return [header, ...matterLines, ...slotLines, ...mismatchLines].join("\n");
}

export function listCorpusMismatches(
  scorecard: CorpusScorecard,
): CorpusSlotScore[] {
  return scorecard.slots.filter(
    (slot) =>
      slot.outcome !== "correct" && slot.outcome !== "correctly_unknown",
  );
}
