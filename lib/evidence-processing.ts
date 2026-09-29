import type {
  EligibleEvidenceItem,
  EvidenceAssociation,
  EvidenceProcessingResult,
  SyntheticEvidenceItem,
  SyntheticMatter,
  SyntheticUser,
} from "@/types/mattermind";

export function isEvidenceAuthorizedForUser(
  evidence: SyntheticEvidenceItem,
  user: SyntheticUser,
) {
  return evidence.authorizedUserIds.includes(user.id);
}

export function determineMatterAssociation(
  evidence: SyntheticEvidenceItem,
  selectedMatter: SyntheticMatter,
): EvidenceAssociation {
  if (
    evidence.sourceSystem === "Clio" &&
    evidence.explicitMatterId === selectedMatter.id
  ) {
    return {
      evidenceId: evidence.id,
      status: "ASSOCIATED",
      method: "AUTHORITATIVE_SOURCE_RELATIONSHIP",
      reason: "Clio authoritatively associates this artifact with the selected matter.",
    };
  }

  if (evidence.explicitMatterId) {
    if (evidence.explicitMatterId === selectedMatter.id) {
      return {
        evidenceId: evidence.id,
        status: "ASSOCIATED",
        method: "EXPLICIT_MATTER_ID",
        reason: "The artifact's explicit matter ID matches the selected matter.",
      };
    }

    return {
      evidenceId: evidence.id,
      status: "NOT_ASSOCIATED",
      method: "NO_ASSOCIATION",
      reason: "The artifact's explicit matter ID identifies another matter.",
    };
  }

  if (evidence.explicitMatterNumber) {
    if (evidence.explicitMatterNumber === selectedMatter.matterNumber) {
      return {
        evidenceId: evidence.id,
        status: "ASSOCIATED",
        method: "EXPLICIT_MATTER_NUMBER",
        reason: "The artifact's explicit matter number matches the selected matter.",
      };
    }

    return {
      evidenceId: evidence.id,
      status: "NOT_ASSOCIATED",
      method: "NO_ASSOCIATION",
      reason: "The artifact's explicit matter number identifies another matter.",
    };
  }

  const sharedParticipants = evidence.participants.filter((participantId) =>
    selectedMatter.participantIds.includes(participantId),
  );

  if (sharedParticipants.length > 0) {
    return {
      evidenceId: evidence.id,
      status: "AMBIGUOUS",
      method: "AMBIGUOUS_PARTICIPANTS",
      reason:
        "Participant overlap can identify a candidate artifact but cannot establish matter membership.",
    };
  }

  return {
    evidenceId: evidence.id,
    status: "NOT_ASSOCIATED",
    method: "NO_ASSOCIATION",
    reason: "No deterministic relationship connects this artifact to the selected matter.",
  };
}

function toEligibleEvidence(
  evidence: SyntheticEvidenceItem,
  association: EvidenceAssociation,
): EligibleEvidenceItem {
  return {
    ...evidence,
    association,
    provenance: {
      source: evidence.sourceSystem,
      originalArtifactId: evidence.id,
      associationMethod: association.method,
      retrieved: "synthetic request execution",
    },
  };
}

export function buildEligibleEvidenceSet({
  user,
  selectedMatter,
  evidenceUniverse,
}: {
  user: SyntheticUser;
  selectedMatter: SyntheticMatter;
  evidenceUniverse: SyntheticEvidenceItem[];
}): EvidenceProcessingResult {
  const matterAuthorized = user.authorizedMatterIds.includes(selectedMatter.id);

  if (!matterAuthorized) {
    return {
      matterAuthorized,
      authorizedEvidence: [],
      associationResults: [],
      ambiguousEvidence: [],
      eligibleEvidence: [],
      counts: {
        total: evidenceUniverse.length,
        authorized: 0,
        associated: 0,
        ambiguous: 0,
        eligible: 0,
      },
    };
  }

  const authorizedEvidence = evidenceUniverse.filter((evidence) =>
    isEvidenceAuthorizedForUser(evidence, user),
  );

  const evaluatedEvidence = authorizedEvidence.map((evidence) => ({
    evidence,
    association: determineMatterAssociation(evidence, selectedMatter),
  }));

  const associationResults = evaluatedEvidence.map(({ association }) => association);
  const ambiguousEvidence = evaluatedEvidence.filter(
    ({ association }) => association.status === "AMBIGUOUS",
  );
  const associatedEvidence = evaluatedEvidence.filter(
    ({ association }) => association.status === "ASSOCIATED",
  );
  const eligibleEvidence = associatedEvidence
    .map(({ evidence, association }) => toEligibleEvidence(evidence, association))
    .sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    );

  return {
    matterAuthorized,
    authorizedEvidence,
    associationResults,
    ambiguousEvidence,
    eligibleEvidence,
    counts: {
      total: evidenceUniverse.length,
      authorized: authorizedEvidence.length,
      associated: associatedEvidence.length,
      ambiguous: ambiguousEvidence.length,
      eligible: eligibleEvidence.length,
    },
  };
}
