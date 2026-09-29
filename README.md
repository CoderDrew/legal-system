# MatterMind

MatterMind is a simulated professional AI product-engineering engagement based on a real-world legal-operations posting. It is a learning and portfolio project; it is not affiliated with, or being developed for, the law firm from the original posting.

All organizations, people, clients, matters, documents, and business data used in this repository must be fictional and synthetic.

## Current phase: MatterMind V1 — Synthetic Vertical Slice

Architecture Phase 1 is **complete enough to begin implementation**. The architecture is not final; the next phase is a synthetic vertical slice that will use implementation and evaluation findings to refine the design.

### Architecture

The [MatterMind V1 architecture](docs/architecture/mattermind-v1-architecture.md) defines the system responsibilities, request lifecycle, conceptual domain objects, provenance flow, authorization and matter-isolation invariant, reasoning pipeline, synthetic-first strategy, and open architecture questions.

The synthetic vertical slice uses Next.js, TypeScript, and Tailwind CSS. Production architecture and infrastructure choices remain open. V1 remains a read-only, bounded evidence-processing pipeline rather than an autonomous agent.

## Run locally

The first browser-based increment uses a synthetic evidence dataset and requires no external integrations.

The current increment applies a deterministic evidence boundary before reconstruction: it filters the synthetic artifact universe by explicit user authorization, evaluates matter association using authoritative or explicit identifiers, excludes ambiguous and unrelated artifacts, and chronologically orders the eligible evidence set. Status claims remain predefined; no AI reasoning is implemented.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Run the verification suite with:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Repository structure

- `docs/discovery/` — meeting records, the discovery log, and unresolved questions
- `docs/mvp/mvp-selection.md` — the selected V1 product scope and boundaries
- `docs/mvp/v1-success-and-risk.md` — V1 success outcomes, evaluation principles, and risk model
- `docs/mvp/v1-technical-feasibility.md` — completed feasibility spikes, findings, constraints, and remaining uncertainties
- `docs/architecture/mattermind-v1-architecture.md` — V1 responsibilities, boundaries, conceptual model, invariants, and implementation handoff
- `docs/presentations/` — presentation artifacts derived from product discovery and decisions
- `source/` — original source material
- `discovery/` — reserved for future discovery working materials; currently empty

## Evidence labels

- **FACT** — Something a fictional stakeholder explicitly told us.
- **OBSERVATION** — Something noticed during discovery that may be significant.
- **HYPOTHESIS** — A possible explanation or product/problem hypothesis that has not been validated.
- **OPEN QUESTION** — Something we still need to investigate.
- **CONSTRAINT** — A boundary or decision explicitly established during discovery.

These labels are intentionally distinct. Hypotheses must not be restated as facts, and observations must not be converted into requirements without supporting discovery evidence.
