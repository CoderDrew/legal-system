import type {
  ApprovalKind,
  EligibleEvidenceItem,
  OperationalEvent,
  OperationalEventSemantics,
  StatusClaim,
  SyntheticMatter,
  SyntheticUser,
} from "@/types/mattermind";

/**
 * Helper: Get the effective timestamp for an event.
 * Uses occurredAt when available, else sourceRecordedAt.
 */
function getEventTimestamp(event: OperationalEvent): number {
  return new Date(
    event.occurredAt ?? event.provenance.sourceRecordedAt
  ).getTime();
}

/**
 * Helper: Compare two events by timestamp with tie-breaking rules.
 * Returns the later event, or current if equal by timestamp with eventId tie-break.
 *
 * Tie-break rules:
 * 1. Later timestamp wins
 * 2. On timestamp tie, prefer event with explicit occurredAt over null
 * 3. On timestamp + occurredAt tie, lexicographic eventId comparison
 */
function compareEventsByTime(
  latest: OperationalEvent,
  current: OperationalEvent
): OperationalEvent {
  const latestTime = getEventTimestamp(latest);
  const currentTime = getEventTimestamp(current);

  if (currentTime > latestTime) return current;
  if (currentTime < latestTime) return latest;

  // Timestamps equal - prefer events with explicit occurredAt
  if (current.occurredAt !== null && latest.occurredAt === null) return current;
  if (current.occurredAt === null && latest.occurredAt !== null) return latest;

  // Both null or both non-null: tie-break with eventId
  return current.eventId > latest.eventId ? current : latest;
}

/**
 * Helper: Get the most recent event from an array.
 */
function getLatestEvent(events: OperationalEvent[]): OperationalEvent {
  return events.reduce(compareEventsByTime);
}

/**
 * Helper: Check if an event is superseded by any later event of specified types.
 */
function isEventSupersededByLater(
  event: OperationalEvent,
  allEvents: OperationalEvent[],
  supersedingTypes: OperationalEvent["eventType"][]
): boolean {
  const eventTime = getEventTimestamp(event);

  for (const otherEvent of allEvents) {
    if (supersedingTypes.includes(otherEvent.eventType)) {
      const otherTime = getEventTimestamp(otherEvent);
      if (
        otherTime > eventTime ||
        (otherTime === eventTime && otherEvent.eventId > event.eventId)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Helper: Check if there's a strictly later substantive event after the given event.
 * Used for staleness detection.
 */
function hasLaterSubstantiveEvent(
  event: OperationalEvent,
  allEvents: OperationalEvent[]
): boolean {
  const eventTime = getEventTimestamp(event);

  for (const otherEvent of allEvents) {
    if (
      otherEvent.eventType === "DOCUMENT_SENT" ||
      otherEvent.eventType === "DOCUMENT_REVIEWED" ||
      otherEvent.eventType === "MATTER_STATUS_RECORDED" ||
      otherEvent.eventType === "APPROVAL_REQUESTED"
    ) {
      const otherTime = getEventTimestamp(otherEvent);
      if (otherTime > eventTime) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Helper: Exact email local-part match against a person's name.
 * "jordan.smith" matches "Jordan Smith"; "jordan.smithson" does not.
 */
function emailLocalPartMatchesPerson(email: string, personName: string): boolean {
  const localPart = email.toLowerCase().split("@")[0];
  const expected = personName.toLowerCase().trim().replace(/\s+/g, ".");
  return localPart === expected;
}

/**
 * Helper: Check if an email artifact was sent to the client.
 * Uses exact local-part matching to avoid false positives.
 */
function isClientRecipient(
  artifact: EligibleEvidenceItem,
  matter: SyntheticMatter
): boolean {
  if (artifact.artifactType !== "Email" || !artifact.to) {
    return false;
  }

  return artifact.to.some((email) =>
    emailLocalPartMatchesPerson(email, matter.client)
  );
}

/**
 * Helper: Check if an email artifact was sent by the named person.
 * Uses exact local-part matching on the from field.
 */
function isEmailFromPerson(
  artifact: EligibleEvidenceItem | undefined,
  personName: string
): boolean {
  if (!artifact?.from) {
    return false;
  }
  return emailLocalPartMatchesPerson(artifact.from, personName);
}

/**
 * Whole-label role keys. Comparison is case-insensitive and exact;
 * names such as "Courtney Smith" do not match "court".
 */
const CLIENT_ROLE_LABELS = new Set(["client", "the client"]);
const OWN_SIDE_ROLE_LABELS = new Set([
  "attorney",
  "our attorney",
  "responsible attorney",
  "our firm",
  "counsel of record",
  "firm paralegal",
  "paralegal",
]);
const EXTERNAL_ROLE_LABELS = new Set([
  "opposing counsel",
  "opposing attorney",
  "court",
  "the court",
  "judge",
  "third party",
  "third-party",
]);
const COURT_ROLE_LABELS = new Set(["court", "court clerk"]);

function normalizedActorLabel(actor: string): string {
  return actor.trim().toLowerCase();
}

function actorEqualsName(actor: string, personName: string): boolean {
  return normalizedActorLabel(actor) === personName.trim().toLowerCase();
}

/**
 * Helper: Check if an actor represents an external party.
 * Returns true for known external roles (opposing counsel, court, third party).
 */
function isExternalActor(actor: string | null): boolean {
  if (!actor) {
    return false;
  }
  const label = normalizedActorLabel(actor);
  return EXTERNAL_ROLE_LABELS.has(label);
}

function isClientActor(actor: string | null, matter: SyntheticMatter): boolean {
  if (!actor) return false;
  const label = normalizedActorLabel(actor);
  return CLIENT_ROLE_LABELS.has(label) || actorEqualsName(actor, matter.client);
}

function isOwnSideActor(
  actor: string | null,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser
): boolean {
  if (!actor) return false;
  const label = normalizedActorLabel(actor);
  return (
    OWN_SIDE_ROLE_LABELS.has(label) ||
    actorEqualsName(actor, matter.responsibleAttorney) ||
    actorEqualsName(actor, requestingUser.name)
  );
}

function artifactAddresses(artifact: EligibleEvidenceItem): string[] {
  return [
    artifact.from,
    ...(artifact.to ?? []),
    ...(artifact.cc ?? []),
  ].filter((address): address is string => Boolean(address));
}

/**
 * Consumer mailbox domains. Sharing one of these with opposing counsel
 * must not make them look like our side.
 */
const CONSUMER_MAILBOX_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

/**
 * Firm domains taken from emails of the responsible attorney or requesting user.
 * Example: alex.thompson@lawfirm.example and rachel.morgan@lawfirm.example
 * both yield lawfirm.example. Consumer webmail domains are ignored.
 */
function firmDomainsFromStructuredIdentity(
  matter: SyntheticMatter,
  requestingUser: SyntheticUser,
  eligibleEvidence: EligibleEvidenceItem[]
): Set<string> {
  const ownSidePeople = [matter.responsibleAttorney, requestingUser.name];
  const domains = new Set<string>();

  for (const artifact of eligibleEvidence) {
    for (const address of artifactAddresses(artifact)) {
      if (
        ownSidePeople.some((person) =>
          emailLocalPartMatchesPerson(address, person)
        )
      ) {
        const domain = address.toLowerCase().split("@")[1];
        if (domain && !CONSUMER_MAILBOX_DOMAINS.has(domain)) {
          domains.add(domain);
        }
      }
    }
  }

  return domains;
}

function isEmailFromOwnSide(
  artifact: EligibleEvidenceItem | undefined,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser,
  eligibleEvidence: EligibleEvidenceItem[]
): boolean {
  if (!artifact?.from) {
    return false;
  }
  if (
    isEmailFromPerson(artifact, matter.responsibleAttorney) ||
    isEmailFromPerson(artifact, requestingUser.name)
  ) {
    return true;
  }
  const domain = artifact.from.toLowerCase().split("@")[1];
  if (!domain) {
    return false;
  }
  return firmDomainsFromStructuredIdentity(
    matter,
    requestingUser,
    eligibleEvidence
  ).has(domain);
}

/**
 * True when a document was sent by the client or our own attorney/firm.
 * Uses actor whole-label / exact name match, then exact email local-part.
 */
function isDocumentFromClientOrOwnSide(
  event: OperationalEvent,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser,
  eligibleEvidence: EligibleEvidenceItem[]
): boolean {
  if (
    isClientActor(event.actor, matter) ||
    isOwnSideActor(event.actor, matter, requestingUser)
  ) {
    return true;
  }

  const artifact = eligibleEvidence.find(
    (item) => item.id === event.provenance.sourceArtifactId
  );
  return (
    isEmailFromPerson(artifact, matter.client) ||
    isEmailFromOwnSide(artifact, matter, requestingUser, eligibleEvidence)
  );
}

function isDocumentFromClient(
  event: OperationalEvent,
  matter: SyntheticMatter,
  eligibleEvidence: EligibleEvidenceItem[]
): boolean {
  if (isClientActor(event.actor, matter)) {
    return true;
  }
  const artifact = eligibleEvidence.find(
    (item) => item.id === event.provenance.sourceArtifactId
  );
  return isEmailFromPerson(artifact, matter.client);
}

/**
 * Map a document sender to the recipient phrase used in next-action text.
 * Known role labels are mapped as whole labels. Personal and organization
 * names keep their original casing. Returns null for client / own-side
 * senders so the caller can avoid "Respond to <client/us>".
 */
function mapActorToRecipient(
  actor: string | null,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser
): string | null {
  if (!actor) return "the sender";

  const label = normalizedActorLabel(actor);
  if (label === "opposing counsel") return "opposing counsel";
  if (COURT_ROLE_LABELS.has(label)) return "the court";
  if (
    isClientActor(actor, matter) ||
    isOwnSideActor(actor, matter, requestingUser)
  ) {
    return null;
  }

  return actor;
}

const WAITING_SUPERSEDING_TYPES: OperationalEvent["eventType"][] = [
  "DOCUMENT_SENT",
  "APPROVAL_REQUESTED",
  "DOCUMENT_REVIEWED",
];

/**
 * Shared open-wait detection used by waiting-on and next-action.
 * WAITING_STATE_REPORTED is dropped when a later superseding event exists.
 * APPROVAL_REQUESTED stays in the open set; callers apply extra staleness.
 */
function collectOpenWaitingEvents(
  matterEvents: OperationalEvent[]
): OperationalEvent[] {
  const waitingEvents = matterEvents.filter(
    (event) =>
      event.eventType === "APPROVAL_REQUESTED" ||
      event.eventType === "WAITING_STATE_REPORTED"
  );

  const openWaitingEvents: OperationalEvent[] = [];
  for (const waitingEvent of waitingEvents) {
    if (waitingEvent.eventType === "WAITING_STATE_REPORTED") {
      if (
        isEventSupersededByLater(
          waitingEvent,
          matterEvents,
          WAITING_SUPERSEDING_TYPES
        )
      ) {
        continue;
      }
    }
    openWaitingEvents.push(waitingEvent);
  }
  return openWaitingEvents;
}

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Parse the explicit asOf cutoff. Empty or invalid values must not be
 * treated as a valid timestamp — Date.parse on those yields NaN, and
 * `NaN - approvalTime >= SIX_MONTHS_MS` is false, which would silently
 * mean "never stale".
 */
function parseAsOfTime(asOf: string): number | null {
  if (typeof asOf !== "string") {
    return null;
  }
  const trimmed = asOf.trim();
  if (trimmed === "") {
    return null;
  }
  const time = Date.parse(trimmed);
  return Number.isFinite(time) ? time : null;
}

function eventSemantics(event: OperationalEvent): OperationalEventSemantics {
  return event.semantics ?? {};
}

function isClientApprovalKind(kind: ApprovalKind | undefined): boolean {
  return kind === "client_approval" || kind === "client_review";
}

function approvalTargetPhrase(semantics: OperationalEventSemantics): string {
  switch (semantics.approvalKind) {
    case "client_approval":
      return "client approval";
    case "attorney_approval":
      return "attorney approval";
    case "client_review":
      return "client review";
    case "attorney_review":
      return "attorney review";
    case "review":
      return "review";
    case "decision":
      return "decision";
    case "approval":
      return semantics.namedApprover
        ? `${semantics.namedApprover}'s approval`
        : "approval";
    default:
      return "approval";
  }
}

function waitingOnValueFromApprovalKind(kind: ApprovalKind): string {
  switch (kind) {
    case "client_approval":
      return "Client approval";
    case "attorney_approval":
      return "Attorney approval";
    case "client_review":
    case "attorney_review":
    case "review":
      return "Review";
    case "decision":
      return "Decision";
    case "approval":
      return "Approval";
  }
}

function currentStatusFromDocument(
  documentEvent: OperationalEvent,
  approvalEvent: OperationalEvent
): string {
  const documentSemantics = eventSemantics(documentEvent);
  const approvalTarget = approvalTargetPhrase(eventSemantics(approvalEvent));
  const rawObject = documentEvent.object || approvalEvent.object || "document";
  const subject = documentSemantics.documentSubject || "document";
  const capitalizedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);

  switch (documentSemantics.documentForm) {
    case "revised":
      return `${capitalizedSubject} revisions are awaiting ${approvalTarget}.`;
    case "draft":
      return `Draft ${subject} is awaiting ${approvalTarget}.`;
    case "proposed":
      return `Proposed ${subject} is awaiting ${approvalTarget}.`;
    default:
      return `${rawObject} awaiting ${approvalTarget}.`;
  }
}

function isClosedOrSettledStatusEvent(event: OperationalEvent): boolean {
  if (event.eventType !== "MATTER_STATUS_RECORDED") {
    return false;
  }
  const status = eventSemantics(event).recordedStatus;
  return status === "settled" || status === "closed";
}

function isLaterBySourceRecordedAt(
  candidate: OperationalEvent,
  reference: OperationalEvent
): boolean {
  const candidateTime = new Date(candidate.provenance.sourceRecordedAt).getTime();
  const referenceTime = new Date(reference.provenance.sourceRecordedAt).getTime();
  return (
    candidateTime > referenceTime ||
    (candidateTime === referenceTime && candidate.eventId > reference.eventId)
  );
}

function latestMatterStatusRecorded(
  events: OperationalEvent[]
): OperationalEvent | null {
  const statusEvents = events.filter(
    (event) => event.eventType === "MATTER_STATUS_RECORDED"
  );
  if (statusEvents.length === 0) {
    return null;
  }
  return statusEvents.reduce((latest, current) => {
    const latestTime = new Date(latest.provenance.sourceRecordedAt).getTime();
    const currentTime = new Date(current.provenance.sourceRecordedAt).getTime();
    if (currentTime > latestTime) return current;
    if (currentTime < latestTime) return latest;
    return current.eventId > latest.eventId ? current : latest;
  });
}

function currentStatusFromRecordedStatus(event: OperationalEvent): StatusClaim {
  const status = eventSemantics(event).recordedStatus;
  return {
    id: "current-status",
    label: "Current Status",
    value:
      status === "settled" ? "The matter is settled." : "The matter is closed.",
    state: "SUPPORTED",
    evidenceIds: [event.provenance.sourceArtifactId],
  };
}

/**
 * Next-action staleness for approvals: later Settled/Closed status,
 * a later client document, or about six months of silence.
 */
function isApprovalStaleForNextAction(
  approval: OperationalEvent,
  allMatterEvents: OperationalEvent[],
  matter: SyntheticMatter,
  eligibleEvidence: EligibleEvidenceItem[],
  asOf: string
): boolean {
  const approvalTime = getEventTimestamp(approval);

  for (const event of allMatterEvents) {
    const eventTime = getEventTimestamp(event);
    if (eventTime <= approvalTime) continue;

    if (isClosedOrSettledStatusEvent(event)) {
      return true;
    }

    if (
      event.eventType === "DOCUMENT_SENT" &&
      isDocumentFromClient(event, matter, eligibleEvidence)
    ) {
      return true;
    }
  }

  const asOfTime = parseAsOfTime(asOf);
  if (asOfTime === null) {
    return true;
  }
  return asOfTime - approvalTime >= SIX_MONTHS_MS;
}

/**
 * Who the pending approval is waiting on, shared with waiting-on.
 * Structured recipient first, then typed approvalKind. Action text is
 * never parsed.
 */
function resolveApprovalDecisionPhrase(
  waitingEvent: OperationalEvent,
  matter: SyntheticMatter,
  eligibleEvidence: EligibleEvidenceItem[]
): string {
  const artifact = eligibleEvidence.find(
    (item) => item.id === waitingEvent.provenance.sourceArtifactId
  );
  if (artifact && isClientRecipient(artifact, matter)) {
    return "the client makes a decision";
  }

  switch (eventSemantics(waitingEvent).approvalKind) {
    case "client_approval":
    case "client_review":
      return "the client makes a decision";
    case "attorney_approval":
      return "attorney approval";
    case "attorney_review":
    case "review":
      return "review";
    case "decision":
      return "a decision";
    default:
      return "approval";
  }
}

function formatLastImportantEventDescription(
  event: OperationalEvent,
  matter: SyntheticMatter
): string {
  let actorDisplay: string;
  if (event.actor) {
    actorDisplay =
      event.actor === matter.responsibleAttorney ? "Attorney" : event.actor;
  } else {
    actorDisplay = "";
  }

  const semantics = eventSemantics(event);
  const object = event.object;

  if (
    event.eventType === "APPROVAL_REQUESTED" &&
    isClientApprovalKind(semantics.approvalKind) &&
    object
  ) {
    const actor = actorDisplay || event.actor || "Someone";
    return `${actor} requested client approval of the ${object.toLowerCase()}.`;
  }

  const actionText = event.action;
  let description: string;
  if (actorDisplay) {
    const actionLowercased =
      actionText.charAt(0).toLowerCase() + actionText.slice(1);
    description = `${actorDisplay} ${actionLowercased}`;
  } else {
    description = actionText;
  }

  if (!description.endsWith(".")) {
    description = `${description}.`;
  }
  return description;
}

/**
 * Derives the last-important-event slot from operational events.
 *
 * Historical-event slot: the most recent substantive operational event,
 * formatted with date and description. Record-keeping events
 * (MATTER_STATUS_RECORDED, RESPONSIBILITY_RECORDED) are excluded.
 *
 * APPROVAL_REQUESTED uses a client-approval template only when
 * semantics.approvalKind is a client kind and object is present.
 * Other events use actor plus the display `action` field; `action` is
 * not parsed for meaning.
 */
export function deriveLastImportantEventSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
): StatusClaim {
  const matterEvents = events.filter((e) =>
    e.matterId === matterId &&
    e.eventType !== "MATTER_STATUS_RECORDED" &&
    e.eventType !== "RESPONSIBILITY_RECORDED"
  );

  if (matterEvents.length === 0) {
    return {
      id: "last-important-event",
      label: "Last Important Event",
      value: "Unknown",
      state: "UNKNOWN",
      evidenceIds: [],
    };
  }

  const latestEvent = getLatestEvent(matterEvents);
  const eventTimestamp =
    latestEvent.occurredAt ?? latestEvent.provenance.sourceRecordedAt;
  const eventDate = new Date(eventTimestamp);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    id: "last-important-event",
    label: "Last Important Event",
    value: `${formattedDate} — ${formatLastImportantEventDescription(latestEvent, matter)}`,
    state: "SUPPORTED",
    evidenceIds: [latestEvent.provenance.sourceArtifactId],
  };
}

/**
 * Derives the waiting-on slot from operational events.
 *
 * Supersession-type slot: waiting states remain open until resolved or
 * superseded. APPROVAL_REQUESTED uses structured email recipient matching
 * first, then semantics.approvalKind. Missing both is UNKNOWN; action
 * text is never parsed.
 *
 * A later substantive event after an open approval downgrades SUPPORTED
 * to INFERRED (staleness), which is reasoning rather than text inference.
 */
export function deriveWaitingOnSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
  eligibleEvidence: EligibleEvidenceItem[],
): StatusClaim {
  const matterEvents = events.filter((e) => e.matterId === matterId);

  if (matterEvents.length === 0) {
    return {
      id: "waiting-on",
      label: "Waiting On",
      value: "Unknown",
      state: "UNKNOWN",
      evidenceIds: [],
    };
  }

  const openWaitingEvents = collectOpenWaitingEvents(matterEvents);

  if (openWaitingEvents.length === 0) {
    return {
      id: "waiting-on",
      label: "Waiting On",
      value: "Unknown",
      state: "UNKNOWN",
      evidenceIds: [],
    };
  }

  const latestWaiting = getLatestEvent(openWaitingEvents);

  let derivedState: "SUPPORTED" | "INFERRED" = "SUPPORTED";
  if (
    latestWaiting.eventType === "APPROVAL_REQUESTED" &&
    hasLaterSubstantiveEvent(latestWaiting, matterEvents)
  ) {
    derivedState = "INFERRED";
  }

  let waitingOnValue: string | null = null;

  if (latestWaiting.eventType === "APPROVAL_REQUESTED") {
    const sourceArtifact = eligibleEvidence.find(
      (e) => e.id === latestWaiting.provenance.sourceArtifactId
    );
    const clientRecipient = sourceArtifact
      ? isClientRecipient(sourceArtifact, matter)
      : false;

    if (clientRecipient) {
      waitingOnValue = "Client approval";
    } else {
      const approvalKind = eventSemantics(latestWaiting).approvalKind;
      if (approvalKind) {
        waitingOnValue = waitingOnValueFromApprovalKind(approvalKind);
      }
    }
  } else {
    waitingOnValue = latestWaiting.object || "Response";
  }

  if (waitingOnValue === null) {
    return {
      id: "waiting-on",
      label: "Waiting On",
      value: "Unknown",
      state: "UNKNOWN",
      evidenceIds: [],
    };
  }

  return {
    id: "waiting-on",
    label: "Waiting On",
    value: waitingOnValue,
    state: derivedState,
    evidenceIds: [latestWaiting.provenance.sourceArtifactId],
  };
}

/**
 * Derives the current-status slot from operational events using supersession reasoning.
 *
 * A WAITING_STATE_REPORTED event is superseded by a later DOCUMENT_SENT,
 * APPROVAL_REQUESTED, or DOCUMENT_REVIEWED event. The latest
 * MATTER_STATUS_RECORDED at or before asOf supersedes an earlier open
 * approval or waiting state only when that latest status is settled or
 * closed; a later active status re-opens the matter. Only events at or
 * before asOf are considered. Invalid asOf is UNKNOWN.
 * Status sentences are composed from semantics.documentForm,
 * semantics.documentSubject, semantics.approvalKind, and
 * semantics.recordedStatus — never by parsing action or object text.
 * Object is used only as a display noun when documentForm is plain or
 * omitted.
 */
function unknownCurrentStatus(): StatusClaim {
  return {
    id: "current-status",
    label: "Current Status",
    value: "Unknown",
    state: "UNKNOWN",
    evidenceIds: [],
  };
}

export function deriveCurrentStatusSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
  asOf: string,
): StatusClaim {
  void matter;
  const asOfTime = parseAsOfTime(asOf);
  if (asOfTime === null) {
    return unknownCurrentStatus();
  }

  const matterEvents = events.filter(
    (e) => e.matterId === matterId && getEventTimestamp(e) <= asOfTime
  );

  if (matterEvents.length === 0) {
    return unknownCurrentStatus();
  }

  const latestEvent = matterEvents.reduce((latest, current) => {
    const latestTime = new Date(latest.provenance.sourceRecordedAt).getTime();
    const currentTime = new Date(current.provenance.sourceRecordedAt).getTime();

    if (currentTime > latestTime) return current;
    if (currentTime < latestTime) return latest;
    return current.eventId > latest.eventId ? current : latest;
  });

  const waitingEvents = matterEvents.filter(
    (e) => e.eventType === "WAITING_STATE_REPORTED",
  );

  const supersededWaitingIds = new Set<string>();
  for (const waitingEvent of waitingEvents) {
    const waitingTime = new Date(
      waitingEvent.provenance.sourceRecordedAt,
    ).getTime();

    for (const event of matterEvents) {
      if (
        event.eventType === "DOCUMENT_SENT" ||
        event.eventType === "APPROVAL_REQUESTED" ||
        event.eventType === "DOCUMENT_REVIEWED"
      ) {
        const eventTime = new Date(event.provenance.sourceRecordedAt).getTime();
        const supersedes =
          eventTime > waitingTime ||
          (eventTime === waitingTime && event.eventId > waitingEvent.eventId);

        if (supersedes) {
          supersededWaitingIds.add(waitingEvent.eventId);
          break;
        }
      }
    }
  }

  const activeWaitingEvents = waitingEvents.filter(
    (e) => !supersededWaitingIds.has(e.eventId),
  );

  const approvalEvents = matterEvents.filter(
    (e) => e.eventType === "APPROVAL_REQUESTED",
  );

  if (approvalEvents.length > 0) {
    const latestApproval = approvalEvents.reduce((latest, current) => {
      const latestTime = new Date(latest.provenance.sourceRecordedAt).getTime();
      const currentTime = new Date(current.provenance.sourceRecordedAt).getTime();

      if (currentTime > latestTime) return current;
      if (currentTime < latestTime) return latest;
      return current.eventId > latest.eventId ? current : latest;
    });

    const latestStatusAfterApproval = latestMatterStatusRecorded(matterEvents);
    if (
      latestStatusAfterApproval &&
      isClosedOrSettledStatusEvent(latestStatusAfterApproval) &&
      isLaterBySourceRecordedAt(latestStatusAfterApproval, latestApproval)
    ) {
      return currentStatusFromRecordedStatus(latestStatusAfterApproval);
    }

    const docEvents = matterEvents.filter((e) => e.eventType === "DOCUMENT_SENT");
    const approvalTime = new Date(latestApproval.provenance.sourceRecordedAt).getTime();

    const relevantDocs = docEvents.filter((doc) => {
      const docTime = new Date(doc.provenance.sourceRecordedAt).getTime();
      return docTime <= approvalTime;
    });

    if (relevantDocs.length > 0) {
      const latestDoc = relevantDocs.reduce((latest, current) => {
        const latestTime = new Date(latest.provenance.sourceRecordedAt).getTime();
        const currentTime = new Date(current.provenance.sourceRecordedAt).getTime();

        if (currentTime > latestTime) return current;
        if (currentTime < latestTime) return latest;
        return current.eventId > latest.eventId ? current : latest;
      });

      return {
        id: "current-status",
        label: "Current Status",
        value: currentStatusFromDocument(latestDoc, latestApproval),
        state: "SUPPORTED",
        evidenceIds: [
          latestDoc.provenance.sourceArtifactId,
          latestApproval.provenance.sourceArtifactId,
        ],
      };
    }

    const approvalObject = latestApproval.object || "approval";
    return {
      id: "current-status",
      label: "Current Status",
      value: `Awaiting ${approvalObject}`,
      state: "SUPPORTED",
      evidenceIds: [latestApproval.provenance.sourceArtifactId],
    };
  }

  if (activeWaitingEvents.length > 0) {
    const latestWaiting = activeWaitingEvents.reduce((latest, current) => {
      const latestTime = new Date(latest.provenance.sourceRecordedAt).getTime();
      const currentTime = new Date(current.provenance.sourceRecordedAt).getTime();

      if (currentTime > latestTime) return current;
      if (currentTime < latestTime) return latest;
      return current.eventId > latest.eventId ? current : latest;
    });

    const latestStatusAfterWaiting = latestMatterStatusRecorded(matterEvents);
    if (
      latestStatusAfterWaiting &&
      isClosedOrSettledStatusEvent(latestStatusAfterWaiting) &&
      isLaterBySourceRecordedAt(latestStatusAfterWaiting, latestWaiting)
    ) {
      return currentStatusFromRecordedStatus(latestStatusAfterWaiting);
    }

    const waitingFor = latestWaiting.object || "action";
    return {
      id: "current-status",
      label: "Current Status",
      value: `Waiting for ${waitingFor}`,
      state: "SUPPORTED",
      evidenceIds: [latestWaiting.provenance.sourceArtifactId],
    };
  }

  const eventType = latestEvent.eventType.toLowerCase().replace(/_/g, " ");
  const eventObject = latestEvent.object || "matter";

  return {
    id: "current-status",
    label: "Current Status",
    value: `${eventType}: ${eventObject}`,
    state: "SUPPORTED",
    evidenceIds: [latestEvent.provenance.sourceArtifactId],
  };
}

function unknownNextAction(): StatusClaim {
  return {
    id: "next-action",
    label: "Next Action",
    value: "Unknown",
    state: "UNKNOWN",
    evidenceIds: [],
  };
}

function inferNextActionFromLatestEvent(
  latestEvent: OperationalEvent
): StatusClaim {
  if (latestEvent.eventType === "DOCUMENT_SENT") {
    return {
      id: "next-action",
      label: "Next Action",
      value: "Review the document and respond.",
      state: "INFERRED",
      evidenceIds: [latestEvent.provenance.sourceArtifactId],
    };
  }
  if (latestEvent.eventType === "DOCUMENT_REVIEWED") {
    return {
      id: "next-action",
      label: "Next Action",
      value: "Respond with decision or next steps.",
      state: "INFERRED",
      evidenceIds: [latestEvent.provenance.sourceArtifactId],
    };
  }
  return unknownNextAction();
}

function nextActionAfterApprovalWithoutExternalSender(
  latestWaiting: OperationalEvent
): StatusClaim {
  const approvalObject = latestWaiting.object;
  return {
    id: "next-action",
    label: "Next Action",
    value: approvalObject
      ? `Proceed with ${approvalObject} after obtaining approval.`
      : "Proceed after obtaining approval.",
    state: "INFERRED",
    evidenceIds: [latestWaiting.provenance.sourceArtifactId],
  };
}

/**
 * Derives the next-action slot from operational events.
 *
 * Inference-type slot: the action that should follow the current
 * operational state. Values are INFERRED or UNKNOWN.
 *
 * Approvals go stale when the matter is later Settled/Closed
 * (semantics.recordedStatus), a later client document exists, or about
 * six months of silence have elapsed. Client identity uses structured
 * recipient matching, then semantics.approvalKind. Action text is never
 * parsed.
 */
export function deriveNextActionSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
  eligibleEvidence: EligibleEvidenceItem[],
  requestingUser: SyntheticUser,
  asOf: string,
): StatusClaim {
  if (parseAsOfTime(asOf) === null) {
    return unknownNextAction();
  }

  const allMatterEvents = events.filter((event) => event.matterId === matterId);
  const statusEvents = allMatterEvents.filter(
    (event) => event.eventType === "MATTER_STATUS_RECORDED"
  );
  if (
    statusEvents.length > 0 &&
    isClosedOrSettledStatusEvent(getLatestEvent(statusEvents))
  ) {
    return unknownNextAction();
  }

  const substantiveEvents = allMatterEvents.filter(
    (event) =>
      event.eventType !== "MATTER_STATUS_RECORDED" &&
      event.eventType !== "RESPONSIBILITY_RECORDED"
  );

  if (substantiveEvents.length === 0) {
    return unknownNextAction();
  }

  const openWaitingEvents = collectOpenWaitingEvents(allMatterEvents).filter(
    (waitingEvent) =>
      waitingEvent.eventType !== "APPROVAL_REQUESTED" ||
      !isApprovalStaleForNextAction(
        waitingEvent,
        allMatterEvents,
        matter,
        eligibleEvidence,
        asOf
      )
  );

  if (openWaitingEvents.length === 0) {
    return inferNextActionFromLatestEvent(getLatestEvent(substantiveEvents));
  }

  const latestWaiting = getLatestEvent(openWaitingEvents);

  if (latestWaiting.eventType === "APPROVAL_REQUESTED") {
    const latestWaitingTime = getEventTimestamp(latestWaiting);
    const relevantDocs = substantiveEvents.filter(
      (event) =>
        event.eventType === "DOCUMENT_SENT" &&
        getEventTimestamp(event) <= latestWaitingTime
    );

    if (relevantDocs.length > 0) {
      const latestDoc = getLatestEvent(relevantDocs);

      if (
        isDocumentFromClientOrOwnSide(
          latestDoc,
          matter,
          requestingUser,
          eligibleEvidence
        )
      ) {
        return nextActionAfterApprovalWithoutExternalSender(latestWaiting);
      }

      const recipient = mapActorToRecipient(
        latestDoc.actor,
        matter,
        requestingUser
      );
      if (recipient === null) {
        return nextActionAfterApprovalWithoutExternalSender(latestWaiting);
      }

      const decisionMaker = resolveApprovalDecisionPhrase(
        latestWaiting,
        matter,
        eligibleEvidence
      );

      return {
        id: "next-action",
        label: "Next Action",
        value: `Respond to ${recipient} after ${decisionMaker}.`,
        state: "INFERRED",
        evidenceIds: [latestWaiting.provenance.sourceArtifactId],
      };
    }

    return nextActionAfterApprovalWithoutExternalSender(latestWaiting);
  }

  if (latestWaiting.eventType === "WAITING_STATE_REPORTED") {
    const waitingFor = latestWaiting.object || "response";
    return {
      id: "next-action",
      label: "Next Action",
      value: `Review and respond after receiving ${waitingFor}.`,
      state: "INFERRED",
      evidenceIds: [latestWaiting.provenance.sourceArtifactId],
    };
  }

  return unknownNextAction();
}

function unknownOwner(): StatusClaim {
  return {
    id: "owner",
    label: "Owner",
    value: "Unknown",
    state: "UNKNOWN",
    evidenceIds: [],
  };
}

function isExcludedOwnerLabel(label: string, matter: SyntheticMatter): boolean {
  const normalized = normalizedActorLabel(label);
  return (
    CLIENT_ROLE_LABELS.has(normalized) ||
    actorEqualsName(label, matter.client) ||
    COURT_ROLE_LABELS.has(normalized) ||
    normalized === "opposing counsel"
  );
}

function firmSideIdentities(
  matter: SyntheticMatter,
  requestingUser: SyntheticUser
): string[] {
  return [matter.responsibleAttorney, requestingUser.name]
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && !actorEqualsName(name, matter.client))
    .sort((left, right) => right.length - left.length);
}

/**
 * Exact match against known firm-side identities only. Role labels and
 * unrecognized names are not owners.
 */
function matchFirmSideIdentity(
  label: string | null,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser
): string | null {
  if (!label) return null;
  if (!normalizedActorLabel(label)) return null;
  if (isExcludedOwnerLabel(label, matter)) return null;
  for (const name of firmSideIdentities(matter, requestingUser)) {
    if (actorEqualsName(label, name)) {
      return name;
    }
  }
  return null;
}

function ownerClaim(
  value: string,
  state: "SUPPORTED" | "INFERRED",
  evidenceId: string
): StatusClaim {
  return {
    id: "owner",
    label: "Owner",
    value,
    state,
    evidenceIds: [evidenceId],
  };
}

/**
 * Derives the owner slot from operational events.
 *
 * Structured data only: the latest RESPONSIBILITY_RECORDED event at or
 * before asOf. semantics.assignedPerson is the current assignee when the
 * event records one; explicit null means no current assignee. When
 * assignedPerson is omitted, the slot is UNKNOWN. Actor, object, and
 * source-email are not used as the assignee. Action text is never
 * parsed. Invalid asOf is UNKNOWN.
 */
export function deriveOwnerSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser,
  asOf: string
): StatusClaim {
  const asOfTime = parseAsOfTime(asOf);
  if (asOfTime === null) {
    return unknownOwner();
  }

  const responsibilityEvents = events.filter(
    (event) =>
      event.matterId === matterId &&
      event.eventType === "RESPONSIBILITY_RECORDED" &&
      getEventTimestamp(event) <= asOfTime
  );

  if (responsibilityEvents.length === 0) {
    return unknownOwner();
  }

  const latest = getLatestEvent(responsibilityEvents);
  const evidenceId = latest.provenance.sourceArtifactId;
  const semantics = eventSemantics(latest);

  if (!Object.prototype.hasOwnProperty.call(semantics, "assignedPerson")) {
    return unknownOwner();
  }

  const assigned = semantics.assignedPerson;
  if (!assigned) {
    return unknownOwner();
  }
  const matched = matchFirmSideIdentity(assigned, matter, requestingUser);
  if (matched) {
    return ownerClaim(matched, "SUPPORTED", evidenceId);
  }
  return unknownOwner();
}

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function isValidCalendarDate(
  year: number,
  month: number,
  day: number
): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return false;
  }
  const utc = Date.UTC(year, month, day);
  const check = new Date(utc);
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month &&
    check.getUTCDate() === day
  );
}

function calendarDateUtcDay(date: CalendarDate): number {
  return Date.UTC(date.year, date.month, date.day);
}

function formatCalendarDate(date: CalendarDate): string {
  return new Date(calendarDateUtcDay(date)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function asOfUtcDay(asOfTime: number): number {
  const asOf = new Date(asOfTime);
  return Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
}

function isCalendarDateCurrentAsOf(date: CalendarDate, asOfTime: number): boolean {
  return calendarDateUtcDay(date) >= asOfUtcDay(asOfTime);
}

function calendarDateFromParts(
  year: number,
  month: number,
  day: number
): CalendarDate | null {
  if (!isValidCalendarDate(year, month, day)) {
    return null;
  }
  return { year, month, day };
}

/**
 * Parse a complete calendar date from semantics.scheduledDate.
 * ISO YYYY-MM-DD, long-form month names, and US MM/DD/YYYY are accepted.
 * This is field parsing of the structured date value, not object or
 * action text inference.
 */
function parseCompleteCalendarDate(text: string): CalendarDate | null {
  const trimmed = text.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (iso) {
    return calendarDateFromParts(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3])
    );
  }

  const monthIndex: Record<string, number> = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sept: 8,
    sep: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };
  const monthNames = Object.keys(monthIndex).join("|");
  const longForm = trimmed.match(
    new RegExp(
      `^(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})$`,
      "i"
    )
  );
  if (longForm) {
    return calendarDateFromParts(
      Number(longForm[3]),
      monthIndex[longForm[1].toLowerCase()],
      Number(longForm[2])
    );
  }

  const numeric = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numeric) {
    return calendarDateFromParts(
      Number(numeric[3]),
      Number(numeric[1]) - 1,
      Number(numeric[2])
    );
  }

  return null;
}

function unknownImportantDate(): StatusClaim {
  return {
    id: "important-date",
    label: "Deadline / Important Date",
    value: "Unknown",
    state: "UNKNOWN",
    evidenceIds: [],
  };
}

function importantDateClaim(
  date: CalendarDate,
  evidenceId: string
): StatusClaim {
  return {
    id: "important-date",
    label: "Deadline / Important Date",
    value: formatCalendarDate(date),
    state: "SUPPORTED",
    evidenceIds: [evidenceId],
  };
}

function currentScheduleDate(event: OperationalEvent): CalendarDate | null {
  const semantics = eventSemantics(event);
  if (!Object.prototype.hasOwnProperty.call(semantics, "scheduledDate")) {
    return null;
  }
  const scheduledDate = semantics.scheduledDate;
  if (!scheduledDate) {
    return null;
  }
  return parseCompleteCalendarDate(scheduledDate);
}

/**
 * Derives the important-date slot from operational events.
 *
 * Structured data only: the latest SCHEDULE_STATUS_REPORTED event at or
 * before asOf. semantics.scheduledDate is the current date when present;
 * explicit null means no current date (cancelled, TBD, relative phrasing).
 * When scheduledDate is omitted, the slot is UNKNOWN. `object` is not
 * parsed as a date. Action text is never parsed. A date whose UTC
 * calendar day is before asOf is no longer current. Invalid asOf is UNKNOWN.
 */
export function deriveImportantDateSlot(
  events: OperationalEvent[],
  matterId: string,
  asOf: string
): StatusClaim {
  const asOfTime = parseAsOfTime(asOf);
  if (asOfTime === null) {
    return unknownImportantDate();
  }

  const scheduleEvents = events.filter(
    (event) =>
      event.matterId === matterId &&
      event.eventType === "SCHEDULE_STATUS_REPORTED" &&
      getEventTimestamp(event) <= asOfTime
  );

  if (scheduleEvents.length === 0) {
    return unknownImportantDate();
  }

  const latest = getLatestEvent(scheduleEvents);
  const evidenceId = latest.provenance.sourceArtifactId;
  const structuredDate = currentScheduleDate(latest);

  if (structuredDate && isCalendarDateCurrentAsOf(structuredDate, asOfTime)) {
    return importantDateClaim(structuredDate, evidenceId);
  }

  return unknownImportantDate();
}

function unknownSignificantNewInformation(): StatusClaim {
  return {
    id: "significant-information",
    label: "Significant New Information",
    value: "Unknown",
    state: "UNKNOWN",
    evidenceIds: [],
  };
}

function significantNewInformationClaim(
  value: string,
  evidenceId: string
): StatusClaim {
  return {
    id: "significant-information",
    label: "Significant New Information",
    value,
    state: "SUPPORTED",
    evidenceIds: [evidenceId],
  };
}

/**
 * Helper: Format the significant new information value from a DOCUMENT_SENT event.
 * Template: "{Actor} supplied {object} on {date}."
 * Lowercases the first letter of object for natural sentence flow.
 */
function formatSignificantNewInformation(event: OperationalEvent): string {
  const actor = event.actor || "External party";
  const rawObject = event.object || "document";
  const object = rawObject.charAt(0).toLowerCase() + rawObject.slice(1);
  const eventTimestamp = event.occurredAt ?? event.provenance.sourceRecordedAt;
  const eventDate = new Date(eventTimestamp);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${actor} supplied ${object} on ${formattedDate}.`;
}

/**
 * Derives the significant-information slot from operational events.
 *
 * Significant information is a document received from an external party.
 * A sender counts as external ONLY when its actor matches a known external
 * role. Everything else is UNKNOWN. Invalid asOf is UNKNOWN. Only events
 * at or before asOf are considered. Action text is never parsed.
 */
export function deriveSignificantNewInformationSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
  eligibleEvidence: EligibleEvidenceItem[],
  requestingUser: SyntheticUser,
  asOf: string
): StatusClaim {
  void eligibleEvidence;
  void requestingUser;
  const asOfTime = parseAsOfTime(asOf);
  if (asOfTime === null) {
    return unknownSignificantNewInformation();
  }

  const documentEvents = events.filter(
    (event) =>
      event.matterId === matterId &&
      event.eventType === "DOCUMENT_SENT" &&
      getEventTimestamp(event) <= asOfTime
  );

  if (documentEvents.length === 0) {
    return unknownSignificantNewInformation();
  }

  const externalDocumentEvents = documentEvents.filter((event) => {
    if (isClientActor(event.actor, matter)) {
      return false;
    }
    return isExternalActor(event.actor);
  });

  if (externalDocumentEvents.length === 0) {
    return unknownSignificantNewInformation();
  }

  const latest = getLatestEvent(externalDocumentEvents);
  return significantNewInformationClaim(
    formatSignificantNewInformation(latest),
    latest.provenance.sourceArtifactId
  );
}
