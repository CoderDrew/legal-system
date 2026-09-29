export type EvidenceState =
  | "SUPPORTED"
  | "INFERRED"
  | "CONFLICTING"
  | "UNKNOWN";

export type SourceSystem = "Clio" | "Outlook";
export type ArtifactType = "Email" | "Matter record" | "Attachment";
export type AssociationStatus =
  | "ASSOCIATED"
  | "AMBIGUOUS"
  | "NOT_ASSOCIATED";
export type AssociationMethod =
  | "AUTHORITATIVE_SOURCE_RELATIONSHIP"
  | "EXPLICIT_MATTER_ID"
  | "EXPLICIT_MATTER_NUMBER"
  | "AMBIGUOUS_PARTICIPANTS"
  | "NO_ASSOCIATION";

export type SyntheticMatter = {
  id: string;
  matterNumber: string;
  name: string;
  client: string;
  responsibleAttorney: string;
  status: "Active";
  participantIds: string[];
};

export type SyntheticUser = {
  id: string;
  name: string;
  authorizedMatterIds: string[];
};

export type SyntheticEvidenceItem = {
  id: string;
  sourceSystem: SourceSystem;
  artifactType: ArtifactType;
  timestamp: string;
  from?: string;
  to?: string[];
  subject?: string;
  content: string;
  explicitMatterId?: string;
  explicitMatterNumber?: string;
  threadId?: string;
  participants: string[];
  authorizedUserIds: string[];
};

export type EvidenceAssociation = {
  evidenceId: string;
  status: AssociationStatus;
  method: AssociationMethod;
  reason: string;
};

export type EligibleEvidenceItem = SyntheticEvidenceItem & {
  association: EvidenceAssociation;
  provenance: {
    source: SourceSystem;
    originalArtifactId: string;
    associationMethod: AssociationMethod;
    retrieved: "synthetic request execution";
  };
};

export type EvidenceProcessingCounts = {
  total: number;
  authorized: number;
  associated: number;
  ambiguous: number;
  eligible: number;
};

export type EvidenceProcessingResult = {
  matterAuthorized: boolean;
  authorizedEvidence: SyntheticEvidenceItem[];
  associationResults: EvidenceAssociation[];
  ambiguousEvidence: Array<{
    evidence: SyntheticEvidenceItem;
    association: EvidenceAssociation;
  }>;
  eligibleEvidence: EligibleEvidenceItem[];
  counts: EvidenceProcessingCounts;
};

export type StatusClaim = {
  id: string;
  label: string;
  value: string;
  state: EvidenceState;
  evidenceIds: string[];
};

export type RetrievalScope = {
  sourcesSearched: string[];
  retrievalMode: string;
  matterIsolation: string;
  request: string;
};

export type MatterStatusBrief = {
  matter: SyntheticMatter;
  claims: StatusClaim[];
  retrievalScope: RetrievalScope;
};
