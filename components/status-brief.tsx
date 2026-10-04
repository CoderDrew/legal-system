import type {
  EligibleEvidenceItem,
  EvidenceProcessingCounts,
  MatterStatusBrief,
  OperationalEvent,
} from "@/types/mattermind";
import { EvidenceStateBadge } from "@/components/evidence-state-badge";
import { CheckIcon, EvidenceIcon, LockIcon } from "@/components/icons";

type StatusBriefProps = {
  brief: MatterStatusBrief;
  eligibleEvidence: EligibleEvidenceItem[];
  operationalEvents: OperationalEvent[];
  processingCounts: EvidenceProcessingCounts;
  onInspectEvidence: (evidenceIds: string[]) => void;
};

export function StatusBrief({
  brief,
  eligibleEvidence,
  operationalEvents,
  processingCounts,
  onInspectEvidence,
}: StatusBriefProps) {
  const currentStatus = brief.claims[0];
  const remainingClaims = brief.claims.slice(1);

  return (
    <div className="space-y-5" aria-live="polite">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.13em] text-slate-200 uppercase">
                  Matter Status Brief
                </span>
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.13em] text-amber-200 uppercase">
                  Synthetic evidence
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {brief.matter.name}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Matter #{brief.matter.matterNumber} · Client: {brief.matter.client}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <CheckIcon className="h-4 w-4 text-teal-300" />
              3 slots derived · 4 slots predefined
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">
                {currentStatus.label}
              </p>
              <p className="mt-2 text-xl font-semibold leading-8 tracking-tight text-slate-950 sm:text-2xl">
                {currentStatus.value}
              </p>
            </div>
            <EvidenceStateBadge state={currentStatus.state} />
          </div>
          <button
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 transition hover:text-teal-950"
            onClick={() => onInspectEvidence(currentStatus.evidenceIds)}
            type="button"
          >
            <EvidenceIcon className="h-4 w-4" />
            Inspect supporting evidence
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {remainingClaims.map((claim) => (
          <section
            className={`flex min-h-48 flex-col rounded-xl border bg-white p-5 shadow-sm sm:p-6 ${
              claim.id === "significant-information" ? "md:col-span-2" : ""
            }`}
            key={claim.id}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-bold tracking-[0.13em] text-slate-500 uppercase">
                {claim.label}
              </p>
              <EvidenceStateBadge state={claim.state} />
            </div>
            <p
              className={`mt-4 text-base leading-7 font-medium ${
                claim.state === "UNKNOWN" ? "text-slate-600" : "text-slate-900"
              }`}
            >
              {claim.value}
            </p>
            <div className="mt-auto pt-5">
              {claim.evidenceIds.length ? (
                <button
                  className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 transition hover:text-teal-950"
                  onClick={() => onInspectEvidence(claim.evidenceIds)}
                  type="button"
                >
                  <EvidenceIcon className="h-4 w-4" />
                  View {claim.evidenceIds.length === 1 ? "source" : "sources"}
                </button>
              ) : (
                <p className="text-xs leading-5 text-slate-500">
                  No authorized evidence establishes a date. Unknown is a valid
                  result.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-800">
              <LockIcon className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Retrieval scope</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                The evidence universe used for this synthetic reconstruction.
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            onClick={() => onInspectEvidence([])}
            type="button"
          >
            <EvidenceIcon className="h-4 w-4" />
            Review all evidence
          </button>
        </div>

        <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-slate-50 p-4">
            <dt className="text-[0.68rem] font-bold tracking-[0.12em] text-slate-500 uppercase">
              Sources searched
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">
              {brief.retrievalScope.sourcesSearched.join(" · ")}
            </dd>
          </div>
          <div className="bg-slate-50 p-4">
            <dt className="text-[0.68rem] font-bold tracking-[0.12em] text-slate-500 uppercase">
              Retrieval mode
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">
              {brief.retrievalScope.retrievalMode}
            </dd>
          </div>
          <div className="bg-slate-50 p-4">
            <dt className="text-[0.68rem] font-bold tracking-[0.12em] text-slate-500 uppercase">
              Matter isolation
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">
              {brief.retrievalScope.matterIsolation}
            </dd>
          </div>
          <div className="bg-slate-50 p-4">
            <dt className="text-[0.68rem] font-bold tracking-[0.12em] text-slate-500 uppercase">
              Request
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">
              {brief.retrievalScope.request}
            </dd>
          </div>
        </dl>
      </section>

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Evidence Processing
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Development view of the deterministic authorization, association,
              and operational-event extraction boundary.
            </p>
          </div>
          <span className="text-xs font-semibold text-teal-800 group-open:hidden">
            Show counts
          </span>
          <span className="hidden text-xs font-semibold text-teal-800 group-open:inline">
            Hide counts
          </span>
        </summary>
        <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              ["Total synthetic artifacts", processingCounts.total],
              ["Authorized artifacts", processingCounts.authorized],
              ["Associated artifacts", processingCounts.associated],
              ["Ambiguous artifacts", processingCounts.ambiguous],
              ["Eligible evidence artifacts", processingCounts.eligible],
              ["Extracted operational events", operationalEvents.length],
            ].map(([label, value]) => (
              <div className="rounded-lg bg-slate-50 p-4" key={label}>
                <dt className="text-xs leading-5 font-medium text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-950">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Only the {eligibleEvidence.length} authorized and deterministically
            associated artifacts can reach event extraction. Ambiguous evidence is
            retained by the processing result but excluded from extraction.
          </p>
          <div className="mt-5 border-t border-slate-200 pt-5">
            <h4 className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">
              Extracted events
            </h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Historical records of operational events. The current-status, last-important-event, and waiting-on slots are
              derived from the matter&apos;s events. The other 4 slots remain predefined.
            </p>
            <ol className="mt-3 space-y-2">
              {operationalEvents.map((event) => (
                <li
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                  key={event.eventId}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <p className="text-sm font-medium text-slate-900">
                      {event.action}
                    </p>
                    <p className="shrink-0 text-xs font-semibold text-teal-800">
                      {event.eventType.replaceAll("_", " ")}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Source: {event.provenance.sourceArtifactId} · Recorded{" "}
                    {new Date(
                      event.provenance.sourceRecordedAt,
                    ).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "UTC",
                      timeZoneName: "short",
                    })}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </details>
    </div>
  );
}
