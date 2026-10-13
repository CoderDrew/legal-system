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
  cc?: string[];
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

export type OperationalEventType =
  | "SCHEDULE_STATUS_REPORTED"
  | "WAITING_STATE_REPORTED"
  | "DOCUMENT_SENT"
  | "MATTER_STATUS_RECORDED"
  | "RESPONSIBILITY_RECORDED"
  | "DOCUMENT_REVIEWED"
  | "APPROVAL_REQUESTED";

/**
 * Who an APPROVAL_REQUESTED event is waiting on, and whether the request
 * is an approval, review, or decision. Used by current-status, waiting-on,
 * next-action, and last-important-event.
 */
export type ApprovalKind =
  | "client_approval"
  | "attorney_approval"
  | "client_review"
  | "attorney_review"
  | "review"
  | "decision"
  | "approval";

/**
 * DOCUMENT_SENT form used to compose current-status sentences.
 * "revised" → "Settlement revisions are awaiting …"
 * "draft" → "Draft contract is awaiting …"
 * "proposed" → "Proposed agreement is awaiting …"
 * "plain" → "{object} awaiting …" with the object casing preserved.
 */
export type DocumentForm = "revised" | "draft" | "proposed" | "plain";

/**
 * MATTER_STATUS_RECORDED operational status. "Active (not settled)" is
 * "active"; reasoners must not treat negation as settled or closed.
 */
export type RecordedMatterStatus = "active" | "settled" | "closed";

/**
 * Typed facts consumed by current-state reasoners.
 *
 * Human-readable `action` and `object` are display fields and must not be
 * parsed for meaning. A missing fact yields UNKNOWN, never a
 * text-inference path or an omitted-field fallback.
 *
 * Each field is used only by the event types named in its comment.
 */
export type OperationalEventSemantics = {
  /**
   * APPROVAL_REQUESTED: who must act and in what mode.
   */
  approvalKind?: ApprovalKind;
  /**
   * APPROVAL_REQUESTED: named non-role approver (for example "Judge Lee")
   * when approvalKind is "approval" and the approver is not a client or
   * attorney role. Current-status emits "{namedApprover}'s approval".
   */
  namedApprover?: string;
  /**
   * DOCUMENT_SENT: form used to compose current-status sentences.
   */
  documentForm?: DocumentForm;
  /**
   * DOCUMENT_SENT: subject noun such as "settlement" or "contract".
   */
  documentSubject?: string;
  /**
   * MATTER_STATUS_RECORDED: recorded operational status.
   */
  recordedStatus?: RecordedMatterStatus;
  /**
   * RESPONSIBILITY_RECORDED: current assignee when the event records one.
   * Explicit null means no current assignee (departure, unassigned,
   * reversal). Omitted means UNKNOWN. Actor, object, and source-email
   * are not the assignee.
   */
  assignedPerson?: string | null;
  /**
   * SCHEDULE_STATUS_REPORTED: current calendar date as YYYY-MM-DD.
   * Explicit null means the report has no current date (cancelled, TBD,
   * relative phrasing). Omitted means UNKNOWN. `object` is not parsed
   * as a date.
   */
  scheduledDate?: string | null;
};

export type OperationalEventDraft = {
  eventId: string;
  matterId: string;
  eventType: OperationalEventType;
  occurredAt: string | null;
  actor: string | null;
  action: string;
  object: string | null;
  /**
   * Typed facts for current-state reasoners. Optional in extraction
   * drafts; missing semantics are treated as `{}`.
   */
  semantics?: OperationalEventSemantics;
};

export type OperationalEventGroundTruthEntry = OperationalEventDraft & {
  evidenceExcerpt: string;
};

export type OperationalEventGroundTruth = Readonly<
  Record<string, readonly OperationalEventGroundTruthEntry[]>
>;

export type OperationalEvent = OperationalEventDraft & {
  extractionMethod: "SYNTHETIC_GROUND_TRUTH";
  provenance: {
    sourceArtifactId: string;
    sourceSystem: SourceSystem;
    sourceRecordedAt: string;
    associationMethod: AssociationMethod;
    evidenceExcerpt: string;
  };
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

export type CurrentStateExpectation = {
  slotId: string;
  expectedState: EvidenceState;
  expectedValue: string | null;
  supportingEventIds: string[];
  supersededEventIds: string[];
  rationale: string;
};

export type CurrentStateGroundTruth = {
  matterId: string;
  asOf: string;
  expectations: CurrentStateExpectation[];
};
