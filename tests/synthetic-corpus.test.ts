import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MATTER_ID,
  syntheticCorpusCases,
} from "@/data/synthetic-corpus";
import {
  syntheticEvidenceUniverse,
  syntheticMatters,
  syntheticOperationalEventGroundTruth,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import {
  evaluateCorpus,
  extractAllCorpusEvents,
  formatCorpusScorecard,
  listCorpusMismatches,
} from "@/lib/corpus-evaluation";
import { reconstructSelectedMatter } from "@/lib/matter-view";
import { BRIEF_SLOT_IDS } from "@/types/mattermind";
import type { AdversarialClass } from "@/types/mattermind";

const scorecard = evaluateCorpus({
  cases: syntheticCorpusCases,
  requestingUser: syntheticRequestingUser,
  evidenceUniverse: syntheticEvidenceUniverse,
  eventGroundTruth: syntheticOperationalEventGroundTruth,
});

test("the corpus includes Smith v. Acme as the default plus six adversarial matters", () => {
  assert.equal(syntheticCorpusCases.length, 7);
  assert.equal(syntheticCorpusCases[0].matter.id, DEFAULT_MATTER_ID);
  assert.equal(syntheticCorpusCases[0].matter.name, "Smith v. Acme");
  assert.equal(syntheticCorpusCases[0].adversarialClass, "baseline");
  assert.equal(syntheticMatters[0].id, DEFAULT_MATTER_ID);
});

test("every adversarial class is covered at least once", () => {
  const classes = [
    ...new Set(syntheticCorpusCases.map((entry) => entry.adversarialClass)),
  ].sort();
  const expected: AdversarialClass[] = [
    "ambiguous-identities",
    "baseline",
    "conflicting-evidence",
    "cross-matter-contamination",
    "missing-evidence",
    "stale-evidence",
  ];
  assert.deepEqual(classes, expected);
});

test("each corpus case has handwritten ground truth for all 7 slots", () => {
  for (const entry of syntheticCorpusCases) {
    assert.equal(entry.currentState.matterId, entry.matter.id);
    assert.equal(entry.currentState.expectations.length, 7);
    assert.deepEqual(
      entry.currentState.expectations.map((item) => item.slotId).sort(),
      [...BRIEF_SLOT_IDS].sort(),
    );
  }
});

test("corpus ground-truth events belong to their own matter and exist in extraction", () => {
  const { eventsByMatter } = extractAllCorpusEvents({
    cases: syntheticCorpusCases,
    requestingUser: syntheticRequestingUser,
    evidenceUniverse: syntheticEvidenceUniverse,
    eventGroundTruth: syntheticOperationalEventGroundTruth,
  });

  for (const entry of syntheticCorpusCases) {
    const extracted = eventsByMatter.get(entry.matter.id) ?? [];
    const extractedIds = extracted.map((event) => event.eventId).sort();
    for (const event of extracted) {
      assert.equal(event.matterId, entry.matter.id);
    }

    for (const expectation of entry.currentState.expectations) {
      for (const eventId of [
        ...expectation.supportingEventIds,
        ...expectation.supersededEventIds,
      ]) {
        assert.equal(
          extractedIds.includes(eventId),
          true,
          `${entry.matter.id} ${expectation.slotId} references ${eventId}`,
        );
      }
    }
  }
});

test("reasoning over the combined corpus never leaks another matter's evidence", () => {
  assert.equal(scorecard.isolationLeaks, 0);
  assert.equal(
    scorecard.slots.filter((slot) => slot.isolationLeak).length,
    0,
  );
});

test("Smith v. Acme still matches its unchanged ground truth when all matters are loaded together", () => {
  const smithSlots = scorecard.slots.filter(
    (slot) => slot.matterId === DEFAULT_MATTER_ID,
  );
  assert.equal(smithSlots.length, 7);
  for (const slot of smithSlots) {
    assert.equal(
      slot.outcome === "correct" || slot.outcome === "correctly_unknown",
      true,
      `${slot.slotId}: expected ${slot.expectedState} ${String(slot.expectedValue)} actual ${slot.actualState} ${slot.actualValue}`,
    );
  }
});

test("the picker default reconstructs Smith v. Acme from that matter's events only", () => {
  const view = reconstructSelectedMatter();
  assert.equal(view.entry.matter.id, DEFAULT_MATTER_ID);
  assert.equal(view.brief.matter.id, DEFAULT_MATTER_ID);
  assert.equal(view.brief.retrievalScope.matterIsolation, "2026-0142");
  for (const event of view.events) {
    assert.equal(event.matterId, DEFAULT_MATTER_ID);
  }
});

test("selecting another matter reconstructs that matter rather than Smith v. Acme", () => {
  const view = reconstructSelectedMatter("matter-2026-0160");
  assert.equal(view.brief.matter.name, "Chen Employment File");
  assert.equal(view.brief.retrievalScope.matterIsolation, "2026-0160");
  for (const event of view.events) {
    assert.equal(event.matterId, "matter-2026-0160");
  }
});

const KNOWN_FINDINGS: ReadonlyArray<{
  matterId: string;
  matterName: string;
  slotId: (typeof BRIEF_SLOT_IDS)[number];
}> = [
  {
    matterId: "matter-2026-0160",
    matterName: "Chen Employment File",
    slotId: "current-status",
  },
  {
    matterId: "matter-2026-0163",
    matterName: "Alan Smith v. Westfield",
    slotId: "current-status",
  },
  {
    matterId: "matter-2026-0163",
    matterName: "Alan Smith v. Westfield",
    slotId: "next-action",
  },
];

function isKnownFinding(slot: (typeof scorecard.slots)[number]): boolean {
  return KNOWN_FINDINGS.some(
    (finding) =>
      finding.matterId === slot.matterId && finding.slotId === slot.slotId,
  );
}

test("the corpus scorecard reports every matter and slot without dropping rows", () => {
  assert.equal(scorecard.matterCount, 7);
  assert.equal(scorecard.slotCount, 49);
  assert.equal(scorecard.byMatter.length, 7);
  assert.equal(scorecard.bySlot.length, 7);
  assert.equal(
    scorecard.correct +
      scorecard.wrongConfident +
      scorecard.falseUnknown +
      scorecard.stateMismatch,
    scorecard.slotCount,
  );
  const report = formatCorpusScorecard(scorecard);
  assert.match(report, /Wrong-confident:/);
  assert.match(report, /Smith v\. Acme/);
  const mismatches = listCorpusMismatches(scorecard);
  assert.equal(Array.isArray(mismatches), true);
});

test("every corpus slot matches ground truth except the three pinned findings", () => {
  assert.equal(scorecard.correct, 46);
  assert.equal(scorecard.wrongConfident, 3);
  assert.equal(scorecard.falseUnknown, 0);
  assert.equal(scorecard.stateMismatch, 0);

  const pinned = scorecard.slots.filter(isKnownFinding);
  assert.equal(pinned.length, KNOWN_FINDINGS.length);
  for (const finding of KNOWN_FINDINGS) {
    const slot = pinned.find(
      (row) =>
        row.matterId === finding.matterId && row.slotId === finding.slotId,
    );
    assertDefinedSlot(slot, finding);
    assert.equal(slot.matterName, finding.matterName);
    assert.equal(
      slot.outcome,
      "wrong_confident",
      `${finding.matterName} ${finding.slotId} is a pinned finding and must stay wrong-confident until the pin is updated`,
    );
    assert.equal(slot.wrongConfident, true);
    assert.equal(
      slot.actualState === slot.expectedState &&
        slot.actualValue === (slot.expectedValue ?? "Unknown"),
      false,
      `${finding.matterName} ${finding.slotId} must still disagree with ground truth`,
    );
  }

  const remaining = scorecard.slots.filter((slot) => !isKnownFinding(slot));
  assert.equal(remaining.length, 46);
  for (const slot of remaining) {
    assert.equal(
      slot.actualState,
      slot.expectedState,
      `${slot.matterName} ${slot.slotId} state`,
    );
    assert.equal(
      slot.actualValue,
      slot.expectedValue ?? "Unknown",
      `${slot.matterName} ${slot.slotId} value`,
    );
    assert.equal(
      slot.outcome === "correct" || slot.outcome === "correctly_unknown",
      true,
      `${slot.matterName} ${slot.slotId}: expected ${slot.expectedState} ${String(slot.expectedValue)} actual ${slot.actualState} ${slot.actualValue}`,
    );
    assert.equal(slot.wrongConfident, false);
  }
});

function assertDefinedSlot(
  slot: (typeof scorecard.slots)[number] | undefined,
  finding: (typeof KNOWN_FINDINGS)[number],
): asserts slot is (typeof scorecard.slots)[number] {
  assert.equal(
    slot === undefined,
    false,
    `${finding.matterName} ${finding.slotId} must remain in the scorecard`,
  );
}
