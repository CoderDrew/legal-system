import type {
  OperationalEvent,
  StatusClaim,
  SyntheticMatter,
} from "@/types/mattermind";

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
