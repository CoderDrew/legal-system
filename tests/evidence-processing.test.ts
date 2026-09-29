import assert from "node:assert/strict";
import test from "node:test";
import {
  syntheticEvidenceUniverse,
  syntheticMatters,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import {
  buildEligibleEvidenceSet,
  determineMatterAssociation,
  isEvidenceAuthorizedForUser,
} from "@/lib/evidence-processing";

const selectedMatter = syntheticMatters[0];
const otherMatter = syntheticMatters[1];

function evidence(id: string) {
  const item = syntheticEvidenceUniverse.find((candidate) => candidate.id === id);
  assert.ok(item, `Expected synthetic evidence ${id}`);
  return item;
}

test("explicit 2026-0142 evidence is associated with the selected matter", () => {
  const result = determineMatterAssociation(
    evidence("email-0142-scheduling"),
    selectedMatter,
  );

  assert.equal(result.status, "ASSOCIATED");
  assert.equal(result.method, "EXPLICIT_MATTER_NUMBER");
});

test("explicit 2026-0159 evidence is not associated with 2026-0142", () => {
  const result = determineMatterAssociation(
    evidence("email-0159-inspection"),
    selectedMatter,
  );

  assert.equal(result.status, "NOT_ASSOCIATED");
});

test("the second Clio matter remains authoritatively associated with itself", () => {
  const result = determineMatterAssociation(
    evidence("clio-matter-0159"),
    otherMatter,
  );

  assert.equal(result.status, "ASSOCIATED");
  assert.equal(result.method, "AUTHORITATIVE_SOURCE_RELATIONSHIP");
});

test("shared participant identity alone remains ambiguous", () => {
  const result = determineMatterAssociation(
    evidence("email-shared-participants-ambiguous"),
    selectedMatter,
  );

  assert.equal(result.status, "AMBIGUOUS");
  assert.equal(result.method, "AMBIGUOUS_PARTICIPANTS");
});

test("unauthorized evidence is removed before association", () => {
  const unauthorized = evidence("email-0142-unauthorized-private");
  const result = buildEligibleEvidenceSet({
    user: syntheticRequestingUser,
    selectedMatter,
    evidenceUniverse: syntheticEvidenceUniverse,
  });

  assert.equal(
    isEvidenceAuthorizedForUser(unauthorized, syntheticRequestingUser),
    false,
  );
  assert.equal(
    result.authorizedEvidence.some((item) => item.id === unauthorized.id),
    false,
  );
  assert.equal(
    result.associationResults.some((item) => item.evidenceId === unauthorized.id),
    false,
  );
  assert.equal(
    result.eligibleEvidence.some((item) => item.id === unauthorized.id),
    false,
  );
});

test("eligible evidence contains only authorized and associated artifacts", () => {
  const result = buildEligibleEvidenceSet({
    user: syntheticRequestingUser,
    selectedMatter,
    evidenceUniverse: syntheticEvidenceUniverse,
  });

  assert.ok(result.eligibleEvidence.length > 0);
  assert.ok(
    result.eligibleEvidence.every(
      (item) =>
        item.authorizedUserIds.includes(syntheticRequestingUser.id) &&
        item.association.status === "ASSOCIATED",
    ),
  );
  assert.equal(
    result.eligibleEvidence.some(
      (item) => item.id === "email-shared-participants-ambiguous",
    ),
    false,
  );
});

test("eligible evidence is ordered chronologically", () => {
  const result = buildEligibleEvidenceSet({
    user: syntheticRequestingUser,
    selectedMatter,
    evidenceUniverse: syntheticEvidenceUniverse,
  });
  const timestamps = result.eligibleEvidence.map((item) =>
    new Date(item.timestamp).getTime(),
  );

  assert.deepEqual(timestamps, [...timestamps].sort((left, right) => left - right));
});

test("Smith v. Acme processing counts expose the deterministic boundary", () => {
  const result = buildEligibleEvidenceSet({
    user: syntheticRequestingUser,
    selectedMatter,
    evidenceUniverse: syntheticEvidenceUniverse,
  });

  assert.deepEqual(result.counts, {
    total: 11,
    authorized: 10,
    associated: 6,
    ambiguous: 1,
    eligible: 6,
  });
});
