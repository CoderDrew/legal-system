import type {
  EligibleEvidenceItem,
  OperationalEvent,
  StatusClaim,
  SyntheticMatter,
} from "@/types/mattermind";

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

  // Find all waiting-type events
  const waitingEvents = matterEvents.filter(
    (e) => 
      e.eventType === "APPROVAL_REQUESTED" || 
      e.eventType === "WAITING_STATE_REPORTED"
  );

  if (waitingEvents.length === 0) {
    return {
      id: "waiting-on",
      label: "Waiting On",
      value: "Unknown",
      state: "UNKNOWN",
      evidenceIds: [],
    };
  }

  // Check which waiting events are still open (not superseded)
  const openWaitingEvents: OperationalEvent[] = [];

  for (const waitingEvent of waitingEvents) {
    const waitingTime = new Date(
      waitingEvent.occurredAt ?? waitingEvent.provenance.sourceRecordedAt
    ).getTime();

    let isSuperseded = false;

    // WAITING_STATE_REPORTED is superseded by later substantive events
    if (waitingEvent.eventType === "WAITING_STATE_REPORTED") {
      for (const event of matterEvents) {
        if (
          event.eventType === "DOCUMENT_SENT" ||
          event.eventType === "APPROVAL_REQUESTED" ||
          event.eventType === "DOCUMENT_REVIEWED"
        ) {
          const eventTime = new Date(
            event.occurredAt ?? event.provenance.sourceRecordedAt
          ).getTime();
          const supersedes =
            eventTime > waitingTime ||
            (eventTime === waitingTime && event.eventId > waitingEvent.eventId);

          if (supersedes) {
            isSuperseded = true;
            break;
          }
        }
      }
    }

    // APPROVAL_REQUESTED stays open (no resolution logic yet in V1)
    // In a future version, check for approval-received events here

    if (!isSuperseded) {
      openWaitingEvents.push(waitingEvent);
    }
  }

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
  const latestWaiting = openWaitingEvents.reduce((latest, current) => {
    const latestTime = new Date(
      latest.occurredAt ?? latest.provenance.sourceRecordedAt
    ).getTime();
    const currentTime = new Date(
      current.occurredAt ?? current.provenance.sourceRecordedAt
    ).getTime();

    if (currentTime > latestTime) return current;
    if (currentTime < latestTime) return latest;

    // Timestamps are equal - prefer events with explicit occurredAt
    if (current.occurredAt !== null && latest.occurredAt === null) return current;
    if (current.occurredAt === null && latest.occurredAt !== null) return latest;

    // Both null or both non-null: tie-break with eventId
    return current.eventId > latest.eventId ? current : latest;
  });

  // MF3: Check if there's a strictly later substantive event (makes it INFERRED, not SUPPORTED)
  const latestWaitingTime = new Date(
    latestWaiting.occurredAt ?? latestWaiting.provenance.sourceRecordedAt
  ).getTime();

  let hasLaterSubstantiveEvent = false;
  if (latestWaiting.eventType === "APPROVAL_REQUESTED") {
    for (const event of matterEvents) {
      if (
        event.eventType === "DOCUMENT_SENT" ||
        event.eventType === "DOCUMENT_REVIEWED" ||
        event.eventType === "MATTER_STATUS_RECORDED" ||
        event.eventType === "APPROVAL_REQUESTED"
      ) {
        const eventTime = new Date(
          event.occurredAt ?? event.provenance.sourceRecordedAt
        ).getTime();
        
        // Strictly later (not equal)
        if (eventTime > latestWaitingTime) {
          hasLaterSubstantiveEvent = true;
          break;
        }
      }
    }
  }

  // MF2: Derive the waiting-on value from structured data, not action text parsing
  let waitingOnValue: string;
  let derivedState: "SUPPORTED" | "INFERRED" = hasLaterSubstantiveEvent ? "INFERRED" : "SUPPORTED";

  if (latestWaiting.eventType === "APPROVAL_REQUESTED") {
    // Try to resolve from structured data: email recipient to client participant
    const sourceArtifact = eligibleEvidence.find(
      (e) => e.id === latestWaiting.provenance.sourceArtifactId
    );

    let isClientApproval = false;

    if (sourceArtifact && sourceArtifact.artifactType === "Email" && sourceArtifact.to) {
      // Extract client email from participants if possible
      // Require exact local-part match to avoid false positives (e.g., jordan.smithson@ matching Jordan Smith)
      const clientNameLower = matter.client.toLowerCase().trim();
      const expectedLocalPart = clientNameLower.replace(/\s+/g, ".");
      
      // Check if any recipient email has the exact local part
      isClientApproval = sourceArtifact.to.some(email => {
        const localPart = email.toLowerCase().split("@")[0];
        return localPart === expectedLocalPart;
      });
    }

    if (isClientApproval) {
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

      // Derive status from the approval action and document context
      const approvalAction = latestApproval.action.toLowerCase();
      const docObject = (latestDoc.object || latestApproval.object || "document").toLowerCase();
      
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
        const subjectMatch = docObject.match(/revised?\s+(\w+)/i);
        const subject = subjectMatch ? subjectMatch[1] : "document";
        statusText = `${subject.charAt(0).toUpperCase() + subject.slice(1)} revisions are awaiting ${approvalTarget}.`;
      } else if (docObject.includes("draft")) {
        const subjectMatch = docObject.match(/draft\s+(\w+)/i);
        const subject = subjectMatch ? subjectMatch[1] : "document";
        statusText = `Draft ${subject} is awaiting ${approvalTarget}.`;
      } else if (docObject.includes("proposed")) {
        const subjectMatch = docObject.match(/proposed\s+(\w+)/i);
        const subject = subjectMatch ? subjectMatch[1] : "document";
        statusText = `Proposed ${subject} is awaiting ${approvalTarget}.`;
      } else {
        // Generic: use the object directly
        statusText = `${docObject.charAt(0).toUpperCase() + docObject.slice(1)} awaiting ${approvalTarget}.`;
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
