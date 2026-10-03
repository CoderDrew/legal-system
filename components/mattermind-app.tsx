"use client";

import { useCallback, useState } from "react";
import {
  syntheticEvidenceUniverse,
  syntheticMatterBrief,
  syntheticOperationalEventGroundTruth,
  syntheticRequestingUser,
} from "@/data/synthetic-matter";
import { buildEligibleEvidenceSet } from "@/lib/evidence-processing";
import { extractOperationalEvents } from "@/lib/operational-events";
import { deriveCurrentStatusSlot } from "@/lib/current-state-reasoning";
import { EvidencePanel } from "@/components/evidence-panel";
import { StatusBrief } from "@/components/status-brief";
import { ArrowRightIcon, DocumentIcon, LockIcon } from "@/components/icons";

const evidenceProcessing = buildEligibleEvidenceSet({
  user: syntheticRequestingUser,
  selectedMatter: syntheticMatterBrief.matter,
  evidenceUniverse: syntheticEvidenceUniverse,
});

const operationalEvents = extractOperationalEvents({
  eligibleEvidence: evidenceProcessing.eligibleEvidence,
  groundTruth: syntheticOperationalEventGroundTruth,
  matterId: syntheticMatterBrief.matter.id,
});

// Derive the current-status slot from events (supersession-type slot)
const derivedCurrentStatusSlot = deriveCurrentStatusSlot(
  operationalEvents,
  syntheticMatterBrief.matter.id,
  syntheticMatterBrief.matter,
);

// Build the brief with the derived current-status slot and predefined other slots
const matterBrief = {
  ...syntheticMatterBrief,
  claims: syntheticMatterBrief.claims.map((claim) =>
    claim.id === "current-status" ? derivedCurrentStatusSlot : claim,
  ),
};

export function MatterMindApp() {
  const [isGenerated, setIsGenerated] = useState(false);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[] | null>(
    null,
  );

  const closeEvidence = useCallback(() => setSelectedEvidenceIds(null), []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-200">
              <span className="text-sm font-bold tracking-tight">M</span>
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight">MatterMind</p>
              <p className="text-[0.68rem] font-medium tracking-[0.13em] text-slate-400 uppercase">
                Active Matter Status
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-slate-300 sm:flex">
            <LockIcon className="h-4 w-4 text-teal-300" />
            Read-only · Synthetic V1
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <section className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-bold tracking-[0.16em] text-teal-800 uppercase">
              Matter orientation
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Active Matter Status
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Reconstruct the current operational state of a selected matter from
              authorized, inspectable evidence.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Synthetic evidence environment
          </div>
        </section>

        <section
          aria-labelledby="matter-selection-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_45px_-36px_rgba(15,23,42,0.4)] sm:p-6"
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label
                className="text-xs font-bold tracking-[0.13em] text-slate-500 uppercase"
                htmlFor="matter-selector"
                id="matter-selection-title"
              >
                Selected matter
              </label>
              <div className="relative mt-2">
                <select
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-12 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-slate-400"
                  id="matter-selector"
                  value={syntheticMatterBrief.matter.id}
                  onChange={() => undefined}
                >
                  <option value={syntheticMatterBrief.matter.id}>
                    {syntheticMatterBrief.matter.name} — Matter #
                    {syntheticMatterBrief.matter.matterNumber}
                  </option>
                </select>
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-slate-500">
                  ▼
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                One authorized synthetic matter is available in this increment.
              </p>
            </div>

            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 disabled:cursor-default disabled:bg-slate-700"
              disabled={isGenerated}
              onClick={() => setIsGenerated(true)}
              type="button"
            >
              {isGenerated ? (
                <>
                  <DocumentIcon className="h-4.5 w-4.5" />
                  Sample Brief Shown
                </>
              ) : (
                <>
                  <DocumentIcon className="h-4.5 w-4.5" />
                  Show Sample Status Brief
                  <ArrowRightIcon className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </div>
        </section>

        <div className="mt-6">
          {isGenerated ? (
            <StatusBrief
              brief={matterBrief}
              eligibleEvidence={evidenceProcessing.eligibleEvidence}
              onInspectEvidence={setSelectedEvidenceIds}
              operationalEvents={operationalEvents}
              processingCounts={evidenceProcessing.counts}
            />
          ) : (
            <section className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white text-teal-800 shadow-sm">
                  <DocumentIcon className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-lg font-semibold text-slate-950">
                  No status brief shown
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This increment derives the current-status slot (supersession-type)
                  from operational events. The other 6 slots remain predefined. Show
                  the brief to review claims, evidence states, and source provenance.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <footer className="mx-auto flex max-w-7xl flex-col gap-1 border-t border-slate-200 px-5 py-6 text-xs text-slate-500 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <p>Clio remains the system of record.</p>
        <p>No legal deadline determination or operational action is performed.</p>
      </footer>

      <EvidencePanel
        evidence={evidenceProcessing.eligibleEvidence}
        onClose={closeEvidence}
        selectedEvidenceIds={selectedEvidenceIds}
      />
    </main>
  );
}
