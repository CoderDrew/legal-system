import type {
  EligibleEvidenceItem,
  OperationalEvent,
  OperationalEventGroundTruth,
} from "@/types/mattermind";

export function extractOperationalEvents({
  eligibleEvidence,
  groundTruth,
  matterId,
}: {
  eligibleEvidence: EligibleEvidenceItem[];
  groundTruth: OperationalEventGroundTruth;
  matterId: string;
}): OperationalEvent[] {
  return eligibleEvidence
    .flatMap((evidence) =>
      (groundTruth[evidence.id] ?? []).map((event) => {
        if (event.matterId !== matterId) {
          throw new Error(
            `Operational event ${event.eventId} has matter ${event.matterId}, which does not match selected matter ${matterId}.`,
          );
        }

        if (!evidence.content.includes(event.evidenceExcerpt)) {
          throw new Error(
            `Evidence excerpt for event ${event.eventId} is not a substring of artifact ${evidence.id} content.`,
          );
        }

        const { evidenceExcerpt, ...eventWithoutExcerpt } = event;

        return {
          ...eventWithoutExcerpt,
          extractionMethod: "SYNTHETIC_GROUND_TRUTH" as const,
          provenance: {
            sourceArtifactId: evidence.provenance.originalArtifactId,
            sourceSystem: evidence.provenance.source,
            sourceRecordedAt: evidence.timestamp,
            associationMethod: evidence.provenance.associationMethod,
            evidenceExcerpt,
          },
        };
      }),
    )
    .sort((left, right) => {
      const recordedAtDifference =
        new Date(left.provenance.sourceRecordedAt).getTime() -
        new Date(right.provenance.sourceRecordedAt).getTime();

      if (recordedAtDifference) {
        return recordedAtDifference;
      }

      return left.eventId < right.eventId
        ? -1
        : left.eventId > right.eventId
          ? 1
          : 0;
    });
}
