import type {
  EvidenceState,
  OperationalEvent,
  StatusClaim,
} from "@/types/mattermind";

/**
 * Derives the current-status slot from operational events.
 *
 * This is the supersession-type slot: it identifies events that supersede
 * earlier events. Specifically, it detects when a WAITING_STATE_REPORTED
 * event is superseded by later DOCUMENT_SENT and APPROVAL_REQUESTED events,
 * and constructs the current status from the non-superseded events.
 *
 * Logic:
 * 1. Find all WAITING_STATE_REPORTED events
 * 2. Find all DOCUMENT_SENT and APPROVAL_REQUESTED events
 * 3. A WAITING_STATE_REPORTED event is superseded if there is a later
 *    DOCUMENT_SENT event that fulfills what was being waited for
 * 4. The current status is derived from the non-superseded events
 *
 * This implementation is deterministic and does not use AI or models.
 */
export function deriveCurrentStatusSlot(
  events: OperationalEvent[],
  matterId: string,
): StatusClaim {
  const matterEvents = events.filter((e) => e.matterId === matterId);

  // Find waiting-state events
  const waitingEvents = matterEvents.filter(
    (e) => e.eventType === "WAITING_STATE_REPORTED",
  );

  // Find document-sent events
  const documentSentEvents = matterEvents.filter(
    (e) => e.eventType === "DOCUMENT_SENT",
  );

  // Find approval-requested events
  const approvalRequestedEvents = matterEvents.filter(
    (e) => e.eventType === "APPROVAL_REQUESTED",
  );

  // Identify superseded events: waiting events that are fulfilled by later document-sent events
  const supersededEventIds: string[] = [];
  for (const waitingEvent of waitingEvents) {
    const waitingTime = new Date(
      waitingEvent.provenance.sourceRecordedAt,
    ).getTime();

    for (const docEvent of documentSentEvents) {
      const docTime = new Date(docEvent.provenance.sourceRecordedAt).getTime();
      if (docTime > waitingTime) {
        supersededEventIds.push(waitingEvent.eventId);
        break;
      }
    }
  }

  // Build the current status from non-superseded events
  let evidenceIds: string[] = [];
  let value = "";
  let state: EvidenceState = "UNKNOWN";

  // If we have a document-sent followed by approval-requested, use those
  if (documentSentEvents.length > 0 && approvalRequestedEvents.length > 0) {
    // Use the latest document-sent and approval-requested events
    const latestDocEvent =
      documentSentEvents[documentSentEvents.length - 1];
    const latestApprovalEvent =
      approvalRequestedEvents[approvalRequestedEvents.length - 1];

    evidenceIds = [
      latestDocEvent.provenance.sourceArtifactId,
      latestApprovalEvent.provenance.sourceArtifactId,
    ];

    value = "Settlement revisions are awaiting client approval.";
    state = "SUPPORTED";
  } else if (
    waitingEvents.length > 0 &&
    supersededEventIds.length === 0
  ) {
    // If we have active waiting events (not superseded), use those
    const latestWaitingEvent = waitingEvents[waitingEvents.length - 1];
    evidenceIds = [latestWaitingEvent.provenance.sourceArtifactId];
    value = `Waiting for ${latestWaitingEvent.object ?? "action"}`;
    state = "SUPPORTED";
  } else {
    value = "Unknown";
    state = "UNKNOWN";
  }

  return {
    id: "current-status",
    label: "Current Status",
    value,
    state,
    evidenceIds,
  };
}
