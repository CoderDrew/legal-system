import type {
  EligibleEvidenceItem,
  OperationalEvent,
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

function isClosedOrSettledStatusEvent(event: OperationalEvent): boolean {
  if (event.eventType !== "MATTER_STATUS_RECORDED") {
    return false;
  }
  const text = `${event.action} ${event.object ?? ""}`.toLowerCase();
  const withoutNegation = text.replace(/\bnot\s+(settled|closed)\b/g, "");
  return /\bsettled\b/.test(withoutNegation) || /\bclosed\b/.test(withoutNegation);
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
 * Structured recipient first; PR #7 text fallback only when needed.
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

  const approvalType = deriveApprovalTypeFromText(
    waitingEvent.action,
    matter.client
  );
  if (approvalType === "Client approval") {
    return "the client makes a decision";
  }
  if (approvalType === "Attorney approval") {
    return "attorney approval";
  }
  if (approvalType === "Review") {
    return "review";
  }
  if (approvalType === "Decision") {
    return "a decision";
  }
  return "approval";
}

/**
 * Derives the last-important-event slot from operational events.
 *
 * This is a historical-event slot: it identifies the most recent
 * substantive operational event and formats it with date and description.
 *
 * Selection rule: The most recent event by timestamp (with eventId as tie-breaker).
 * Record-keeping events (MATTER_STATUS_RECORDED, RESPONSIBILITY_RECORDED) are excluded.
 *
 * Format: "{Month} {Day}, {Year} — {Actor role} {normalized action}."
 * Actor normalization: Use "Attorney" if actor matches matter's responsible attorney.
 * Action normalization: Template-based for APPROVAL_REQUESTED, raw text for others.
 *
 * Deterministic: Uses event timestamps, actor, action, and matter context fields.
 * No AI, models, or fixture-specific strings.
 */
export function deriveLastImportantEventSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
): StatusClaim {
  // Exclude record-keeping event types
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

  // Get the latest event by timestamp
  // Use occurredAt when available (more semantically accurate), else sourceRecordedAt
  const latestEvent = matterEvents.reduce((latest, current) => {
    const latestTime = new Date(
      latest.occurredAt ?? latest.provenance.sourceRecordedAt
    ).getTime();
    const currentTime = new Date(
      current.occurredAt ?? current.provenance.sourceRecordedAt
    ).getTime();
    
    if (currentTime > latestTime) return current;
    if (currentTime < latestTime) return latest;
    
    // Timestamps are equal - prefer events with explicit occurredAt (actual events over mentions)
    if (current.occurredAt !== null && latest.occurredAt === null) return current;
    if (current.occurredAt === null && latest.occurredAt !== null) return latest;
    
    // Both null or both non-null: tie-break with eventId
    return current.eventId > latest.eventId ? current : latest;
  });

  // Format the date portion (use occurredAt when available, else sourceRecordedAt)
  const eventTimestamp = latestEvent.occurredAt ?? latestEvent.provenance.sourceRecordedAt;
  const eventDate = new Date(eventTimestamp);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  // Normalize actor: use role if actor matches matter's responsible attorney
  let actorDisplay: string;
  if (latestEvent.actor) {
    actorDisplay = latestEvent.actor === matter.responsibleAttorney 
      ? "Attorney" 
      : latestEvent.actor;
  } else {
    actorDisplay = "";
  }

  // Template-based description for structured event types
  let description: string;
  
  if (latestEvent.eventType === "APPROVAL_REQUESTED") {
    // Template: "{actor role} requested {approver role} approval of the {object}"
    // Only use template when client name is found and object is meaningful
    const actor = actorDisplay || latestEvent.actor || "Someone";
    const object = latestEvent.object;
    
    // Determine if client name appears in action using safe includes check
    const clientName = matter.client.toLowerCase();
    const actionLower = latestEvent.action.toLowerCase();
    
    if (actionLower.includes(clientName) && object) {
      // Use template: replace client name with "client" and use object field
      description = `${actor} requested client approval of the ${object.toLowerCase()}.`;
    } else {
      // Fall back to raw action with actor prepended
      const actionText = latestEvent.action.charAt(0).toLowerCase() + latestEvent.action.slice(1);
      description = `${actor} ${actionText}`;
      if (!description.endsWith(".")) {
        description = `${description}.`;
      }
    }
  } else {
    // Fallback: use raw action text for other event types
    const actionText = latestEvent.action;
    
    if (actorDisplay) {
      // Lowercase first letter of action for continuity with actor name
      const actionLowercased = actionText.charAt(0).toLowerCase() + actionText.slice(1);
      description = `${actorDisplay} ${actionLowercased}`;
    } else {
      description = actionText;
    }
    
    // Ensure description ends with a period
    if (!description.endsWith(".")) {
      description = `${description}.`;
    }
  }

  const eventValue = `${formattedDate} — ${description}`;

  return {
    id: "last-important-event",
    label: "Last Important Event",
    value: eventValue,
    state: "SUPPORTED",
    evidenceIds: [latestEvent.provenance.sourceArtifactId],
  };
}

/**
 * Derives the waiting-on slot from operational events.
 *
 * This is a supersession-type slot: waiting states (APPROVAL_REQUESTED,
 * WAITING_STATE_REPORTED) remain open until resolved or superseded by a later event.
 *
 * Resolution rules:
 * - APPROVAL_REQUESTED is resolved by a later event indicating the approval was received
 *   (not yet implemented - approvals stay open in V1)
 * - WAITING_STATE_REPORTED is superseded by events that fulfill the wait
 *   (DOCUMENT_SENT, APPROVAL_REQUESTED, etc.)
 *
 * Evidence states:
 * - SUPPORTED: An open waiting state is directly evidenced, with no later substantive events
 * - INFERRED: Waiting state derived via reasoning (stale approval or text fallback)
 * - UNKNOWN: No open wait or evidence is insufficient
 *
 * Deterministic: Uses event timestamps, eventType, and structured recipient/participant
 * matching. Text fallback (marked INFERRED) only when structured data is absent.
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

  // Get the most recent open waiting event
  const latestWaiting = getLatestEvent(openWaitingEvents);

  // MF3: Check if there's a strictly later substantive event (makes it INFERRED, not SUPPORTED)
  let derivedState: "SUPPORTED" | "INFERRED" = "SUPPORTED";
  
  if (latestWaiting.eventType === "APPROVAL_REQUESTED") {
    if (hasLaterSubstantiveEvent(latestWaiting, matterEvents)) {
      derivedState = "INFERRED";
    }
  }

  // MF2: Derive the waiting-on value from structured data, not action text parsing
  let waitingOnValue: string;

  if (latestWaiting.eventType === "APPROVAL_REQUESTED") {
    // Try to resolve from structured data: email recipient to client participant
    const sourceArtifact = eligibleEvidence.find(
      (e) => e.id === latestWaiting.provenance.sourceArtifactId
    );

    const clientRecipient = sourceArtifact
      ? isClientRecipient(sourceArtifact, matter)
      : false;

    if (clientRecipient) {
      waitingOnValue = "Client approval";
    } else if (sourceArtifact) {
      // Structured data available but couldn't resolve to client - try text fallback
      waitingOnValue = deriveApprovalTypeFromText(latestWaiting.action, matter.client);
      // Text fallback used, not from structured data, so always mark as INFERRED
      derivedState = "INFERRED";
    } else {
      // No structured data - text fallback
      waitingOnValue = deriveApprovalTypeFromText(latestWaiting.action, matter.client);
      derivedState = "INFERRED";
    }
  } else {
    // WAITING_STATE_REPORTED - use the object
    waitingOnValue = latestWaiting.object || "Response";
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
 * Helper: Derive approval type from action text (fallback when structured data unavailable).
 * Returns "Client approval", "Attorney approval", "Review", "Decision", or "Approval".
 * 
 * Checks named approver before keywords, normalizes apostrophes, uses whole-token matching.
 */
function deriveApprovalTypeFromText(action: string, clientName: string): string {
  const actionLower = action.toLowerCase();
  
  // Normalize apostrophes (straight and curly) - handle all Unicode apostrophe variants
  const normalizedAction = actionLower.replace(/[\u2019\u0027\u2018]/g, "'");
  const normalizedClient = clientName.toLowerCase().replace(/[\u2019\u0027\u2018]/g, "'");
  
  // Check for named approver first (before keywords)
  // Look for pattern: requested/asked [Name]'s approval/decision/review
  // Anchor to requested/asked to avoid capturing preceding words as part of the name
  const possessiveMatch = normalizedAction.match(/(?:requested|asked)\s+([a-z]+(?:[-'][a-z]+)*(?:\s+[a-z]+(?:[-'][a-z]+)*)*)'s\s+(?:approval|decision|review)/);
  
  if (possessiveMatch) {
    const nameInAction = possessiveMatch[1].trim();
    
    // Check if the name matches the client (full name or surname)
    // Use whole-token matching
    const clientTokens = normalizedClient.split(/\s+/);
    const surname = clientTokens[clientTokens.length - 1];
    
    if (nameInAction === normalizedClient || nameInAction === surname) {
      return "Client approval";
    } else {
      // Non-client approval
      return "Approval";
    }
  }
  
  // Keyword-based detection (no named approver found)
  if (actionLower.includes("client approval") || actionLower.includes("client's approval")) {
    return "Client approval";
  } else if (actionLower.includes("attorney approval") || actionLower.includes("attorney's approval")) {
    return "Attorney approval";
  } else if (actionLower.includes("review")) {
    return "Review";
  } else if (actionLower.includes("decision")) {
    return "Decision";
  } else if (actionLower.includes("approval") || actionLower.includes("approve")) {
    return "Approval";
  } else {
    return "Approval";
  }
}

/**
 * Derives the current-status slot from operational events using supersession reasoning.
 *
 * This is the supersession-type slot: it identifies events that supersede
 * earlier events and constructs the current status from non-superseded events.
 *
 * Supersession rule: A WAITING_STATE_REPORTED event is superseded by a later
 * DOCUMENT_SENT or APPROVAL_REQUESTED event that fulfills what was being waited for.
 *
 * Status derivation: The status text is constructed from the action and object
 * fields of the most recent non-superseded events, ordered by timestamp.
 *
 * Deterministic: Uses only event timestamps (with eventId as tie-breaker) and
 * semantic event fields. No AI, models, or fixture-specific strings.
 */
export function deriveCurrentStatusSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
): StatusClaim {
  const matterEvents = events.filter((e) => e.matterId === matterId);

  if (matterEvents.length === 0) {
    return {
      id: "current-status",
      label: "Current Status",
      value: "Unknown",
      state: "UNKNOWN",
      evidenceIds: [],
    };
  }

  // Get the latest event by timestamp (with eventId as tie-breaker)
  const latestEvent = matterEvents.reduce((latest, current) => {
    const latestTime = new Date(latest.provenance.sourceRecordedAt).getTime();
    const currentTime = new Date(current.provenance.sourceRecordedAt).getTime();
    
    if (currentTime > latestTime) return current;
    if (currentTime < latestTime) return latest;
    // Tie-break: use lexicographic comparison of eventId
    return current.eventId > latest.eventId ? current : latest;
  });

  // Identify superseded waiting events
  const waitingEvents = matterEvents.filter(
    (e) => e.eventType === "WAITING_STATE_REPORTED",
  );

  const supersededWaitingIds = new Set<string>();
  for (const waitingEvent of waitingEvents) {
    const waitingTime = new Date(
      waitingEvent.provenance.sourceRecordedAt,
    ).getTime();

    // Check if any later event supersedes this waiting event
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

  // Build status from non-superseded events, using the latest by timestamp
  const activeWaitingEvents = waitingEvents.filter(
    (e) => !supersededWaitingIds.has(e.eventId),
  );

  // If we have an approval request, describe what's being waited for
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

    // Find the most recent document event before or concurrent with the approval
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

      // Derive status from the approval action and document context.
      // Match against a lowercased copy; keep the original object casing
      // in the emitted status, the same way next-action does.
      const approvalAction = latestApproval.action.toLowerCase();
      const rawObject = latestDoc.object || latestApproval.object || "document";
      const docObject = rawObject.toLowerCase();
      
      // Extract the approval target from the action
      // Priority: review > client approval > attorney approval > approval > decision
      let approvalTarget = "approval";
      
      // Check for review first (takes priority over approval if both are present)
      if (approvalAction.includes("review")) {
        if (approvalAction.includes("attorney")) {
          approvalTarget = "attorney review";
        } else if (approvalAction.includes("client")) {
          approvalTarget = "client review";
        } else {
          approvalTarget = "review";
        }
      } else if (approvalAction.includes("approval")) {
        if (approvalAction.includes("client")) {
          approvalTarget = "client approval";
        } else if (approvalAction.includes("your approval")) {
          // "your approval" indicates approval from the recipient (typically client)
          approvalTarget = "client approval";
        } else if (approvalAction.includes("attorney")) {
          approvalTarget = "attorney approval";
        } else {
          // Check for possessive patterns like "Requested [Name]'s approval"
          const possessiveMatch = approvalAction.match(
            /requested\s+([\w\s]+)'s\s+approval/i,
          );
          if (possessiveMatch) {
            const nameInAction = possessiveMatch[1].trim();
            const clientName = matter.client.toLowerCase();
            
            // Check if the name in the action matches the client name
            // (case-insensitive, handles full name or last name)
            if (
              clientName.includes(nameInAction.toLowerCase()) ||
              nameInAction.toLowerCase().includes(clientName)
            ) {
              approvalTarget = "client approval";
            } else {
              // Use the specific person's name, not "client"
              approvalTarget = `${nameInAction}'s approval`;
            }
          } else {
            approvalTarget = "approval";
          }
        }
      } else if (approvalAction.includes("decision")) {
        approvalTarget = "decision";
      }
      
      // Construct a natural status sentence from the document context and approval target
      // Pattern: "{doc description} {is/are} awaiting {approval target}."
      let statusText: string;
      
      // Detect if the document is about revisions/changes
      if (docObject.includes("revised") || docObject.includes("revision")) {
        // Extract the base subject (e.g., "settlement" from "revised settlement language")
        const subjectMatch = rawObject.match(/revised?\s+(\S+)/i);
        const subject = subjectMatch ? subjectMatch[1] : "document";
        statusText = `${subject.charAt(0).toUpperCase() + subject.slice(1)} revisions are awaiting ${approvalTarget}.`;
      } else if (docObject.includes("draft")) {
        const subjectMatch = rawObject.match(/draft\s+(\S+)/i);
        const subject = subjectMatch ? subjectMatch[1] : "document";
        statusText = `Draft ${subject} is awaiting ${approvalTarget}.`;
      } else if (docObject.includes("proposed")) {
        const subjectMatch = rawObject.match(/proposed\s+(\S+)/i);
        const subject = subjectMatch ? subjectMatch[1] : "document";
        statusText = `Proposed ${subject} is awaiting ${approvalTarget}.`;
      } else {
        statusText = `${rawObject} awaiting ${approvalTarget}.`;
      }

      return {
        id: "current-status",
        label: "Current Status",
        value: statusText,
        state: "SUPPORTED",
        evidenceIds: [
          latestDoc.provenance.sourceArtifactId,
          latestApproval.provenance.sourceArtifactId,
        ],
      };
    }

    // Just approval, no document context
    const approvalObject = latestApproval.object || "approval";
    return {
      id: "current-status",
      label: "Current Status",
      value: `Awaiting ${approvalObject}`,
      state: "SUPPORTED",
      evidenceIds: [latestApproval.provenance.sourceArtifactId],
    };
  }

  // If we have active (non-superseded) waiting events
  if (activeWaitingEvents.length > 0) {
    const latestWaiting = activeWaitingEvents.reduce((latest, current) => {
      const latestTime = new Date(latest.provenance.sourceRecordedAt).getTime();
      const currentTime = new Date(current.provenance.sourceRecordedAt).getTime();
      
      if (currentTime > latestTime) return current;
      if (currentTime < latestTime) return latest;
      return current.eventId > latest.eventId ? current : latest;
    });

    const waitingFor = latestWaiting.object || "action";
    return {
      id: "current-status",
      label: "Current Status",
      value: `Waiting for ${waitingFor}`,
      state: "SUPPORTED",
      evidenceIds: [latestWaiting.provenance.sourceArtifactId],
    };
  }

  // Fallback: describe the latest event
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
 * Inference-type slot: reasons about the action that should follow the
 * current operational state.
 *
 * - Open, non-stale APPROVAL_REQUESTED: respond to the latest external
 *   document sender after the pending approval.
 * - Open WAITING_STATE_REPORTED: act after receiving the waited-for object.
 * - Otherwise infer from the latest substantive event, or UNKNOWN.
 *
 * Approvals go stale when the matter is later Settled/Closed, a later
 * client document exists, or about six months of silence have elapsed.
 * Client identity uses structured recipient matching (and PR #7's text
 * fallback). Actor roles use whole-label mapping; personal/org names keep
 * their original casing. Never emits "Respond to <client>" or
 * "Respond to <our attorney/firm>".
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

const ATTORNEY_OWNER_ROLE_LABELS = new Set([
  "attorney",
  "our attorney",
  "responsible attorney",
  "counsel of record",
  "owner",
  "matter owner",
  "assigned attorney",
]);

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

function isResponsibilityRoleLabel(label: string | null): boolean {
  if (!label) return false;
  return ATTORNEY_OWNER_ROLE_LABELS.has(normalizedActorLabel(label));
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

function resolveOwnerFromArtifact(
  artifact: EligibleEvidenceItem | undefined,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser
): string | null {
  if (!artifact?.from) return null;
  if (isEmailFromPerson(artifact, matter.client)) {
    return null;
  }
  if (isEmailFromPerson(artifact, matter.responsibleAttorney)) {
    return matter.responsibleAttorney;
  }
  if (isEmailFromPerson(artifact, requestingUser.name)) {
    return requestingUser.name;
  }
  return null;
}

function actionMentionsPerson(action: string, personName: string): boolean {
  const trimmed = personName.trim();
  if (!trimmed) return false;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(action);
}

function boundPersonName(personName: string): string {
  return personName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentionedFirmSideIdentities(
  text: string,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser
): string[] {
  return firmSideIdentities(matter, requestingUser).filter((name) =>
    actionMentionsPerson(text, name)
  );
}

function normalizedStatement(text: string): string {
  return text.trim().replace(/[.]+$/g, "").trim();
}

/**
 * Split on clause boundaries. `and` starts a new clause only when it
 * introduces a file transfer (resigned and the file was reassigned to
 * Y). Any leftover `and` in the final clause makes that clause
 * multi-part and therefore not clean.
 */
function splitOwnerClauses(text: string): string[] {
  return normalizedStatement(text)
    .split(
      /(?:[.;]+|\s+\bbut\b\s+|,?\s*\bthen\b\s+|\s+\band\s+(?=(?:the\s+file\s+was\s+)?(?:reassigned|transferred|handed(?:\s+off)?)\s+to\b))/i
    )
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function isMultiPartOwnerClause(clause: string): boolean {
  return /\band\b/i.test(clause);
}

function clauseStartsHistorical(clause: string): boolean {
  return /^(?:at\s+first|originally|previously|formerly|initially)\b/i.test(
    clause
  );
}

/**
 * The final clause is a clean positive assignment or transfer TO this
 * known identity, with nothing after that assignment in the clause.
 * Earlier departure clauses about other people are ignored.
 */
function isCleanPositiveClause(clause: string, name: string): boolean {
  const escaped = boundPersonName(name);
  if (!escaped) return false;
  const text = normalizedStatement(clause);
  if (clauseStartsHistorical(text)) return false;
  return [
    `^(?:recorded|assigned|named|designated|appointed)\\s+${escaped}\\s+as\\s+(?:the\\s+)?(?:responsible\\s+attorney|owner|counsel(?:\\s+of\\s+record)?)$`,
    `^(?:now\\s+)?(?:the\\s+file\\s+was\\s+)?(?:assigned|reassigned|transferred|handed(?:\\s+off)?)\\s+to\\s+${escaped}$`,
    `^(?:transferred|reassigned|handed(?:\\s+off)?)\\s+from\\b[\\s\\S]+?\\bto\\s+${escaped}$`,
    `(?:^|and\\s+)(?:noted\\s+that\\s+)?${escaped}\\s+(?:took\\s+over|has\\s+taken\\s+over|is\\s+taking\\s+over)(?:\\s+from\\b.*)?$`,
    `(?:^|and\\s+)(?:noted\\s+that\\s+)?${escaped}\\s+(?:will\\s+handle|is\\s+handling|handles)(?:\\s+[\\w][\\w\\s'-]*)?$`,
    `^[\\s\\S]*?\\bwas\\s+replaced\\s+by\\s+${escaped}$`,
    `^replaced\\s+by\\s+${escaped}$`,
    `^succeeded\\s+by\\s+${escaped}$`,
  ].some((source) => new RegExp(source, "i").test(text));
}

/**
 * Text fallback: the final clause is a clean positive assignment or
 * transfer TO a known firm-side identity, and nothing after it reverses
 * it. Earlier departure clauses about other people are fine. Extra
 * clauses in the final position, or more than one assigned name in that
 * clause, are UNKNOWN.
 */
function inferOwnerFromActionText(
  action: string,
  matter: SyntheticMatter,
  requestingUser: SyntheticUser
): string | null {
  const clauses = splitOwnerClauses(action);
  const last = clauses[clauses.length - 1];
  if (!last || clauseStartsHistorical(last) || isMultiPartOwnerClause(last)) {
    return null;
  }
  const assigned = mentionedFirmSideIdentities(
    last,
    matter,
    requestingUser
  ).filter((name) => isCleanPositiveClause(last, name));
  if (assigned.length === 1) {
    return assigned[0];
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
 * Structured data first: the latest RESPONSIBILITY_RECORDED event at or
 * before asOf. Actor and object must themselves be known firm-side
 * identities (responsible attorney or requesting user). A role label
 * such as "Responsible attorney" is not the person. Email local-part
 * matching is used when the source artifact identifies a known person.
 * Text is an INFERRED fallback only when the final clause is a clean
 * positive assignment or transfer TO a known firm-side identity, with
 * nothing after that assignment reversing it. Earlier departure clauses
 * about other people are fine. Extra clauses in the final position, or
 * more than one assigned name, are UNKNOWN.
 *
 * Smith v. Acme is SUPPORTED because its event action is
 * "Recorded Alex Thompson as the responsible attorney." — a clean
 * positive assignment of a known firm-side identity, not a special case.
 */
export function deriveOwnerSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
  eligibleEvidence: EligibleEvidenceItem[],
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
  const artifact = eligibleEvidence.find(
    (item) => item.id === latest.provenance.sourceArtifactId
  );
  const evidenceId = latest.provenance.sourceArtifactId;

  const structuredOwner =
    matchFirmSideIdentity(latest.actor, matter, requestingUser) ??
    matchFirmSideIdentity(latest.object, matter, requestingUser) ??
    resolveOwnerFromArtifact(artifact, matter, requestingUser);

  if (structuredOwner) {
    return ownerClaim(structuredOwner, "SUPPORTED", evidenceId);
  }

  const textOwner = inferOwnerFromActionText(
    latest.action,
    matter,
    requestingUser
  );
  if (textOwner) {
    const recordedAsResponsibility =
      isResponsibilityRoleLabel(latest.object) ||
      isResponsibilityRoleLabel(latest.actor);
    return ownerClaim(
      textOwner,
      recordedAsResponsibility ? "SUPPORTED" : "INFERRED",
      evidenceId
    );
  }

  return unknownOwner();
}

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

type CalendarDateMatch = CalendarDate & {
  index: number;
  length: number;
};

const MONTH_INDEX: Record<string, number> = {
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

  const monthNames = Object.keys(MONTH_INDEX).join("|");
  const longForm = trimmed.match(
    new RegExp(
      `^(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})$`,
      "i"
    )
  );
  if (longForm) {
    return calendarDateFromParts(
      Number(longForm[3]),
      MONTH_INDEX[longForm[1].toLowerCase()],
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

function findCalendarDatesInText(text: string): CalendarDateMatch[] {
  const matches: CalendarDateMatch[] = [];
  const monthNames = Object.keys(MONTH_INDEX).join("|");

  for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    if (match.index === undefined) continue;
    const date = calendarDateFromParts(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
    if (date) {
      matches.push({ ...date, index: match.index, length: match[0].length });
    }
  }

  for (const match of text.matchAll(
    new RegExp(
      `\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`,
      "gi"
    )
  )) {
    if (match.index === undefined) continue;
    const date = calendarDateFromParts(
      Number(match[3]),
      MONTH_INDEX[match[1].toLowerCase()],
      Number(match[2])
    );
    if (date) {
      matches.push({ ...date, index: match.index, length: match[0].length });
    }
  }

  for (const match of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    if (match.index === undefined) continue;
    const date = calendarDateFromParts(
      Number(match[3]),
      Number(match[1]) - 1,
      Number(match[2])
    );
    if (date) {
      matches.push({ ...date, index: match.index, length: match[0].length });
    }
  }

  return matches.sort((left, right) => left.index - right.index);
}

function datesEqual(left: CalendarDate, right: CalendarDate): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

function caseInsensitiveToken(word: string): string {
  return word.replace(/[A-Za-z]/g, (ch) => `[${ch.toUpperCase()}${ch.toLowerCase()}]`);
}

function caseInsensitivePhrase(phrase: string): string {
  return phrase.split(/\s+/).map(caseInsensitiveToken).join("\\s+");
}

function calendarDateTokenPattern(): string {
  const monthNames = Object.keys(MONTH_INDEX)
    .map(caseInsensitiveToken)
    .join("|");
  return `(?:\\d{4}-\\d{2}-\\d{2}|(?:${monthNames})\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}/\\d{1,2}/\\d{4})`;
}

function scheduleSubjectPattern(): string {
  const head = [
    "Motion hearing",
    "Status conference",
    "Hearing",
    "Trial",
    "Deposition",
    "Mediation",
    "Conference",
    "Deadline",
    "Response",
    "Filing",
  ]
    .map(caseInsensitivePhrase)
    .join("|");
  const ofName =
    "(?:\\s+[Oo][Ff]\\s+[A-Z][A-Za-z'-]*(?:\\s+[A-Z][A-Za-z'-]*){0,2})?";
  return `(?:${head}${ofName})`;
}

function schedulePlaceWordPattern(): string {
  const stems = [
    "cancel",
    "vacat",
    "postpon",
    "stay",
    "stricken",
    "struck",
    "off",
    "continu",
    "tbd",
    "tba",
    "adjourn",
    "defer",
    "suspend",
    "withdraw",
    "drop",
    "moot",
    "hold",
    "remov",
  ]
    .map(caseInsensitiveToken)
    .join("|");
  // Title case only: first letter upper, rest not ALL-CAPS.
  return `(?!(?:${stems}))[A-Z][a-z]+(?:['-][A-Za-z]+)*`;
}

function scheduleRoomNumberPattern(): string {
  return "[A-Za-z]?[0-9]+[A-Za-z]?";
}

function schedulePlacePattern(): string {
  const room = `(?:(?:${["Courtroom", "Room", "Dept", "Department"].map(caseInsensitiveToken).join("|")})\\.?\\s+${scheduleRoomNumberPattern()})`;
  const word = schedulePlaceWordPattern();
  return `(?:${room}|${word})`;
}

function scheduleTimePattern(): string {
  return "(?:\\d{1,2}(?::\\d{2})?\\s*[AaPp]\\.?[Mm]\\.?)";
}

function scheduleAfterDatePattern(): string {
  const time = `(?:\\s+[Aa][Tt]\\s+${scheduleTimePattern()})?`;
  const place = `(?:\\s+(?:[Ii][Nn]|[Aa][Tt])\\s+${schedulePlacePattern()})?`;
  return `${time}${place}`;
}

function hasForbiddenScheduleWords(text: string): boolean {
  return /\b(?:not|never|no|will|be|who|which|that)\b/i.test(text);
}

function statementHasMultipleSentences(text: string): boolean {
  if (splitScheduleSentences(text).length !== 1) return true;
  const withoutFinalStop = text.trim().replace(/[.?!]+$/, "");
  return /[.?!]/.test(withoutFinalStop);
}

function splitScheduleSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=\S)\.(?:\s+|$)/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function hasUniqueScheduleResult(dates: CalendarDate[]): boolean {
  const unique = dates.filter(
    (date, index, all) =>
      all.findIndex((other) => datesEqual(other, date)) === index
  );
  // Defensive: the whole-text template already yields at most one date.
  return unique.length === 1;
}

function isScheduleTargetDate(text: string, date: CalendarDateMatch): boolean {
  const before = text.slice(0, date.index);
  if (
    /(?:\bset\s+for|\bscheduled\s+for|\bdue\s+by|\bdue|\bby)\s+$/i.test(before)
  ) {
    return true;
  }
  return new RegExp(
    `\\b(?:continued|moved|rescheduled)(?:\\s+from\\s+${calendarDateTokenPattern()})?\\s+to\\s+$`,
    "i"
  ).test(before);
}

function allScheduleTargetDates(text: string): CalendarDate[] {
  return findCalendarDatesInText(text).filter((date) =>
    isScheduleTargetDate(text, date)
  );
}

function matchWholeTextScheduleTemplate(text: string): CalendarDate | null {
  const date = calendarDateTokenPattern();
  const after = scheduleAfterDatePattern();
  const subject = `(?:${scheduleSubjectPattern()}\\s+)?`;
  const setForm = `(?:${["set for", "scheduled for", "due by", "due", "by"].map(caseInsensitivePhrase).join("|")})`;
  const continuance = `(?:${["continued", "moved", "rescheduled"].map(caseInsensitiveToken).join("|")})(?:\\s+${caseInsensitiveToken("from")}\\s+${date})?\\s+${caseInsensitiveToken("to")}`;
  const setMatch = text
    .trim()
    .match(new RegExp(`^${subject}${setForm}\\s+(${date})${after}\\.?$`));
  if (setMatch) {
    return parseCompleteCalendarDate(setMatch[1]);
  }
  const continued = text
    .trim()
    .match(new RegExp(`^${subject}${continuance}\\s+(${date})${after}\\.?$`));
  if (continued) {
    return parseCompleteCalendarDate(continued[1]);
  }
  return null;
}

function pickUniqueScheduleDate(
  matched: CalendarDate | null,
  targets: CalendarDate[]
): CalendarDate | null {
  // Defensive: the whole-text template already yields at most one date.
  if (!hasUniqueScheduleResult(targets)) return null;
  return matched;
}

/**
 * Text fallback: the whole trimmed event text must match one schedule
 * template. Anything else is UNKNOWN.
 *
 *   SUBJECT (set for|scheduled for|due|due by|by) DATE [at TIME] [in|at PLACE] [.]
 *   SUBJECT (continued|moved|rescheduled) [from DATE] to DATE [at TIME] [in|at PLACE] [.]
 */
function inferStrictScheduleDate(text: string): CalendarDate | null {
  const statement = text.trim();
  if (!statement) return null;
  if (hasForbiddenScheduleWords(statement)) return null;
  if (statementHasMultipleSentences(statement)) return null;
  const sentence = splitScheduleSentences(statement)[0] ?? statement;
  return pickUniqueScheduleDate(
    matchWholeTextScheduleTemplate(sentence),
    allScheduleTargetDates(statement)
  );
}

/**
 * Text fallback: keep a date only when the whole event text matches
 * the strict schedule template and yields exactly one date.
 */
function pickCurrentCalendarDate(
  _dates: CalendarDateMatch[],
  text: string
): CalendarDate | null {
  return inferStrictScheduleDate(text);
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
  state: "SUPPORTED" | "INFERRED",
  evidenceId: string
): StatusClaim {
  return {
    id: "important-date",
    label: "Deadline / Important Date",
    value: formatCalendarDate(date),
    state,
    evidenceIds: [evidenceId],
  };
}

/**
 * Derives the important-date slot from operational events.
 *
 * Structured data first: the latest SCHEDULE_STATUS_REPORTED event at or
 * before asOf, via getLatestEvent. If the object itself is a complete
 * valid calendar date, that date is SUPPORTED. Otherwise text is an
 * INFERRED fallback only when the whole trimmed action matches one
 * schedule template (plain subject, set for/scheduled for/due/due by/by
 * or continued/moved/rescheduled [from DATE] to DATE, optional time and
 * place). Extra sentences, extra place text, forbidden words, and two
 * or more resulting dates are UNKNOWN. Relative phrasing and bare "to"
 * are UNKNOWN. Numeric dates in text are US MM/DD/YYYY. Comparison with
 * asOf is by UTC calendar day.
 *
 * Later schedule events supersede earlier ones. A date whose UTC
 * calendar day is before asOf is no longer current.
 *
 * Event timestamps are when the report was recorded, not the scheduled
 * date. Smith v. Acme is UNKNOWN because its schedule event object is
 * not a date and its action has no explicit calendar date — not
 * because a fixture phrase is special-cased.
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

  const structuredDate = parseCompleteCalendarDate(latest.object ?? "");
  if (structuredDate) {
    if (!isCalendarDateCurrentAsOf(structuredDate, asOfTime)) {
      return unknownImportantDate();
    }
    return importantDateClaim(structuredDate, "SUPPORTED", evidenceId);
  }

  const inferredDate = pickCurrentCalendarDate(
    findCalendarDatesInText(latest.action),
    latest.action
  );
  if (inferredDate && isCalendarDateCurrentAsOf(inferredDate, asOfTime)) {
    return importantDateClaim(inferredDate, "INFERRED", evidenceId);
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
  state: "SUPPORTED" | "INFERRED",
  evidenceId: string
): StatusClaim {
  return {
    id: "significant-information",
    label: "Significant New Information",
    value,
    state,
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
 * "Significant information" is defined as evidence or documents
 * received from external parties (not the client, not our firm/attorney).
 * This slot identifies the most recent substantive information received
 * from opposing counsel, courts, third parties, or other external sources.
 *
 * Structured data first: the latest DOCUMENT_SENT event from an external
 * party at or before asOf, identified via actor matching.
 * 
 * External party detection: a sender counts as external ONLY when its actor
 * matches a known external role (opposing counsel, court, third party, etc.).
 * Everything else gives UNKNOWN, regardless of email domain.
 * 
 * Events from the client or our firm (responsible attorney, requesting user,
 * firm staff) are excluded. Events that cannot be classified (unknown
 * sender, no identifiable external role) give UNKNOWN.
 *
 * No text fallback is used: determining whether an event is from an external
 * party requires a structured actor matching a known external role.
 *
 * asOf is explicit; an invalid asOf gives UNKNOWN. Only events at or before
 * asOf are considered.
 *
 * Format: "{Actor} supplied {object} on {date}."
 */
export function deriveSignificantNewInformationSlot(
  events: OperationalEvent[],
  matterId: string,
  matter: SyntheticMatter,
  eligibleEvidence: EligibleEvidenceItem[],
  requestingUser: SyntheticUser,
  asOf: string
): StatusClaim {
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
    // Exclude client and own side actors
    if (isClientActor(event.actor, matter)) {
      return false;
    }

    // Accept only if actor matches a known external role
    return isExternalActor(event.actor);
  });

  if (externalDocumentEvents.length === 0) {
    return unknownSignificantNewInformation();
  }

  const latest = getLatestEvent(externalDocumentEvents);
  const evidenceId = latest.provenance.sourceArtifactId;

  return significantNewInformationClaim(
    formatSignificantNewInformation(latest),
    "SUPPORTED",
    evidenceId
  );
}
