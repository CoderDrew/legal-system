# MatterMind

MatterMind is a simulated professional AI product-engineering engagement based on a real-world legal-operations posting. It is a learning and portfolio project; it is not affiliated with, or being developed for, the law firm from the original posting.

All organizations, people, clients, matters, documents, and business data used in this repository must be fictional and synthetic.

Within that engagement, MatterMind V1 is testing whether a read-only product can help an authorized user understand the operational status of one selected legal matter faster, while keeping every material assertion traceable to inspectable evidence and preserving uncertainty when the evidence is insufficient.

## Current phase: MatterMind V1 — Synthetic Vertical Slice

Architecture Phase 1 is complete, and the Synthetic Vertical Slice is in progress. The current implementation reaches deterministic operational-event extraction. It does not yet reconstruct current state from those events.

### Architecture

The [MatterMind V1 architecture](docs/architecture/mattermind-v1-architecture.md) defines the system responsibilities, request lifecycle, conceptual domain objects, provenance flow, authorization and matter-isolation invariant, reasoning pipeline, synthetic-first strategy, and open architecture questions.

The synthetic vertical slice uses Next.js, TypeScript, and Tailwind CSS. Production architecture and infrastructure choices remain open. V1 remains a read-only, bounded evidence-processing pipeline rather than an autonomous agent.

## Run locally

The first browser-based increment uses a synthetic evidence dataset and requires no external integrations.

The current increment applies a deterministic evidence and operational-event boundary before reconstruction. It filters the synthetic artifact universe by explicit user authorization, evaluates matter association using authoritative or explicit identifiers, excludes ambiguous and unrelated artifacts, chronologically orders the eligible evidence set, and maps that eligible evidence to typed operational events using explicit synthetic ground truth.

The implemented path is:

```text
synthetic artifacts
→ authorization
→ matter association
→ eligibility
→ operational-event extraction
```

An operational event records only what eligible evidence establishes happened or was recorded. It is not a conclusion about what is currently true. Historical events remain valid outputs even when later events may eventually supersede their operational significance.

Authorization occurs before matter association so evidence outside the requesting user's scope is never evaluated for relevance or exposed to extraction. **Eligible evidence** means an artifact is both authorized for that user and deterministically associated with the selected matter. Ambiguous candidates remain available to processing diagnostics but cannot reach event extraction.

The current synthetic case contains six eligible artifacts and produces seven events. An attachment containing only metadata legitimately produces no event, while the Clio matter record and client-approval email each produce multiple events. Every event retains the source artifact ID, source system, source-record timestamp, association method, and evidence excerpt.

`occurredAt` records when the underlying event is known to have happened. The separate source-record timestamp records when the source artifact was sent, created, or recorded and provides deterministic ordering when the actual occurrence time is unknown. Missing occurrence times and actors remain `null`; the extractor does not invent them.

The next, deliberately unimplemented boundary is:

```text
operational events
→ current-state and supersession reasoning
```

The visible Matter Status Brief remains predefined synthetic output. It is not generated from the extracted event history.

Not yet implemented: AI or model integration, current-state reasoning, supersession, event reconciliation or deduplication, real Clio or Microsoft 365 integrations, production authentication, production database or infrastructure, and legal deadline calculation or legal conclusions.

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
