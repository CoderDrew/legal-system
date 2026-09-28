# MatterMind

MatterMind is a simulated professional AI product-engineering engagement based on a real-world legal-operations posting. It is a learning and portfolio project; it is not affiliated with, or being developed for, the law firm from the original posting.

All organizations, people, clients, matters, documents, and business data used in this repository must be fictional and synthetic.

## Current phase: MatterMind V1 — Synthetic Vertical Slice

Architecture Phase 1 is **complete enough to begin implementation**. The architecture is not final; the next phase is a synthetic vertical slice that will use implementation and evaluation findings to refine the design.

### Architecture

The [MatterMind V1 architecture](docs/architecture/mattermind-v1-architecture.md) defines the system responsibilities, request lifecycle, conceptual domain objects, provenance flow, authorization and matter-isolation invariant, reasoning pipeline, synthetic-first strategy, and open architecture questions.

No implementation technology has been selected. V1 remains a read-only, bounded evidence-processing pipeline rather than an autonomous agent.

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
