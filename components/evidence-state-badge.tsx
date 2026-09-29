import type { EvidenceState } from "@/types/mattermind";

const stateStyles: Record<EvidenceState, string> = {
  SUPPORTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  INFERRED: "border-amber-200 bg-amber-50 text-amber-800",
  CONFLICTING: "border-rose-200 bg-rose-50 text-rose-800",
  UNKNOWN: "border-slate-200 bg-slate-100 text-slate-700",
};

const stateDots: Record<EvidenceState, string> = {
  SUPPORTED: "bg-emerald-500",
  INFERRED: "bg-amber-500",
  CONFLICTING: "bg-rose-500",
  UNKNOWN: "bg-slate-500",
};

export function EvidenceStateBadge({ state }: { state: EvidenceState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.11em] ${stateStyles[state]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${stateDots[state]}`} />
      {state}
    </span>
  );
}
