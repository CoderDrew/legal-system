# MatterMind

MatterMind is a simulated professional AI product-engineering engagement based on a real-world legal-operations posting. It is a learning and portfolio project; it is not affiliated with, or being developed for, the law firm from the original posting.

All organizations, people, clients, matters, documents, and business data used in this repository must be fictional and synthetic.

Within that engagement, MatterMind V1 is testing whether a read-only product can help an authorized user understand the operational status of one selected legal matter faster, while keeping every material assertion traceable to inspectable evidence and preserving uncertainty when the evidence is insufficient.

## Project tracks

| Track | Status | Record |
| --- | --- | --- |
| Active-matter status brief | **Approved V1.** Read-only active-matter status reconstruction. The synthetic vertical slice is in progress. | [`mvp-selection.md`](docs/mvp/mvp-selection.md), [architecture](docs/architecture/mattermind-v1-architecture.md) |
| Prospective-client intake | **Discovery track. Not approved for implementation.** Parked on Oct 2, 2026 (option (c)) as discovery evidence. No intake code exists or is to be built. | [`docs/discovery/intake-track/`](docs/discovery/intake-track/README.md) |

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

Current-state ground truth is defined for Smith v. Acme (matter-2026-0142). The fixture specifies expected current-state conclusions for each brief slot, including supersession relationships, supporting event IDs, and judgment rationales.

**Deterministic current-state reasoning is partially implemented:** The current-status slot (the supersession-type slot) is now derived from operational events using deterministic supersession logic. This slot identifies when a WAITING_STATE_REPORTED event is superseded by later DOCUMENT_SENT and APPROVAL_REQUESTED events. The derived slot matches the ground-truth expectation exactly.

The other six Matter Status Brief slots remain predefined synthetic output. Full current-state reasoning across all slots is not yet implemented.

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
