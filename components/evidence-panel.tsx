"use client";

import { useEffect } from "react";
import type { EligibleEvidenceItem } from "@/types/mattermind";
import { CloseIcon, DocumentIcon } from "@/components/icons";

type EvidencePanelProps = {
  evidence: EligibleEvidenceItem[];
  selectedEvidenceIds: string[] | null;
  onClose: () => void;
};

export function EvidencePanel({
  evidence,
  selectedEvidenceIds,
  onClose,
}: EvidencePanelProps) {
  useEffect(() => {
    if (selectedEvidenceIds === null) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose, selectedEvidenceIds]);

  if (selectedEvidenceIds === null) return null;

  const visibleEvidence = selectedEvidenceIds.length
    ? evidence.filter((item) => selectedEvidenceIds.includes(item.id))
    : evidence;

  const formatDate = (timestamp: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(timestamp));

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        aria-label="Close evidence panel"
        className="absolute inset-0 cursor-default bg-slate-950/30 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="evidence-panel-title"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-slate-200 bg-[#fbfbf9] shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 sm:px-8">
          <div>
            <p className="mb-1 text-xs font-bold tracking-[0.16em] text-teal-700 uppercase">
              Inspectable provenance
            </p>
            <h2
              className="text-xl font-semibold tracking-tight text-slate-950"
              id="evidence-panel-title"
            >
              {selectedEvidenceIds.length ? "Supporting evidence" : "Evidence set"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {visibleEvidence.length} synthetic source
              {visibleEvidence.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 sm:px-8">
          {visibleEvidence.map((item, index) => (
            <article
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              key={item.id}
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-teal-700 shadow-sm ring-1 ring-slate-200">
                    <DocumentIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Evidence {index + 1}
                    </p>
                    <p className="text-[0.7rem] font-medium tracking-wide text-slate-500 uppercase">
                      {item.sourceSystem} · {item.artifactType}
                    </p>
                  </div>
                </div>
                <time className="text-xs font-medium text-slate-500">
                  {formatDate(item.timestamp)}
                </time>
              </div>

              <div className="space-y-4 px-5 py-5">
                {(item.from || item.subject) && (
                  <dl className="grid gap-3 text-sm">
                    {item.from && (
                      <div className="grid gap-0.5 sm:grid-cols-[4rem_1fr]">
                        <dt className="font-medium text-slate-500">From</dt>
                        <dd className="break-all text-slate-800">{item.from}</dd>
                      </div>
                    )}
                    {item.subject && (
                      <div className="grid gap-0.5 sm:grid-cols-[4rem_1fr]">
                        <dt className="font-medium text-slate-500">Subject</dt>
                        <dd className="font-medium text-slate-900">{item.subject}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <div className="rounded-lg border border-slate-200 bg-[#fafaf8] p-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                    {item.content}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <p className="text-[0.68rem] font-bold tracking-[0.12em] text-slate-500 uppercase">
                    Matter association
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-slate-800 sm:col-start-1">
                    {item.association.method.replaceAll("_", " ")}
                  </p>
                  <div className="sm:col-start-2 sm:row-start-1 sm:row-end-3">
                    <p className="text-[0.68rem] font-bold tracking-[0.12em] text-slate-500 uppercase">
                      Original artifact
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-slate-800">
                      {item.provenance.originalArtifactId}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  {item.association.reason} Retrieved by {item.provenance.retrieved}.
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
          <p className="text-xs leading-5 text-slate-500">
            Synthetic evidence only. No live legal systems or client records were
            accessed.
          </p>
        </div>
      </aside>
    </div>
  );
}
