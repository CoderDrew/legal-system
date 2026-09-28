# MatterMind V1 Architecture

## Purpose and status

This document records the first architecture-design pass for MatterMind V1.

**Architecture Phase 1 checkpoint: Complete enough to begin implementation.**

The architecture is not final. It defines the responsibilities, boundaries, invariants, conceptual domain objects, and open questions needed to begin a synthetic vertical slice. Implementation and evaluation findings should refine the design.

No AI provider, exact model, agent framework, retrieval framework, data platform, cloud platform, deployment infrastructure, or other implementation technology is selected here.

## Product architecture context

MatterMind V1 is a **read-only, evidence-grounded active-matter status reconstruction tool**.

Given one explicitly selected matter, MatterMind retrieves information from a deliberately constrained set of authorized sources and produces a structured reconstruction of the matter's current operational state. Every material assertion should be traceable to supporting source evidence. Contradictory, stale, ambiguous, or insufficient evidence should produce explicit uncertainty rather than manufactured certainty.

Clio remains the system of record. MatterMind does not replace Clio.

The primary V1 architectural question is:

> Can MatterMind retrieve the right evidence, for the right matter, for the right authorized user, at the right time, and preserve enough provenance to justify its reconstruction?

This architecture is constrained by the selected [MVP scope](../mvp/mvp-selection.md), [success outcomes and risk model](../mvp/v1-success-and-risk.md), and [technical feasibility findings](../mvp/v1-technical-feasibility.md).

## Architectural principles

### 1. Deterministic relationships outrank inferred relationships

If a source system authoritatively associates an artifact with a matter, MatterMind should use that relationship rather than ask AI to infer it.

### 2. Authorization precedes relevance

MatterMind may retrieve and use only evidence the requesting user is authorized to access through the underlying source system. Evidence must not be exposed to an AI reasoning layer and filtered for authorization afterward.

### 3. Authorized does not mean complete

Retrieving everything a user is authorized to access does not prove that the result contains everything that exists.

- “No evidence found” does not mean “This did not happen.”
- “Latest evidence retrieved” does not necessarily mean “Latest evidence that exists.”

### 4. Current state is not the same as summary

MatterMind must reason through:

```text
evidence
→ events
→ chronology
→ supersession
→ current operational state
```

Historical statements may remain true as history while no longer describing the current state.

### 5. AI proposes or interprets meaning; software enforces boundaries and structure

Potential AI responsibilities include interpreting natural-language evidence, extracting operational events, recognizing state changes, reasoning about supersession, interpreting conflicts, reconstructing current state, and proposing candidate claims.

Deterministic responsibilities include matter identity, authorization enforcement, source isolation, artifact identity, timestamp ordering where possible, provenance linkage, structural validation, evidence-reference validation, and enforcement of V1 boundaries.

Deterministic mechanisms should be used where they are sufficient.

### 6. Unknown is valid behavior

MatterMind should prefer a useful **Unknown**, **Inferred**, or **Conflicting** result over an unsupported confident assertion.

### 7. V1 is a bounded evidence-processing pipeline, not an autonomous agent

The user explicitly requests a status reconstruction for one selected matter. V1 does not require autonomous goal pursuit, proactive monitoring, or a background agent framework.

## Major system responsibilities

These are logical responsibilities. They do not prescribe deployment units, services, processes, or implementation technologies.

### 1. Request and Matter Context

Establish:

- The authenticated requesting user.
- The authoritative selected matter identity.
- The requested operation.

The user explicitly selects one matter. MatterMind must not ask AI to infer which matter the user means.

### 2. Authorization Boundary

Determine which underlying source-system evidence the requesting user may access. Authorization occurs before relevance evaluation.

### 3. Evidence Acquisition and Matter Association

Retrieve candidate evidence from authorized V1 sources. Acquisition and matter association remain separate responsibilities: finding an Outlook email does not prove that it belongs to the selected matter.

The named Clio and Outlook flow reflects the refined V1 source-boundary hypothesis from feasibility. Its sufficiency remains unproven and must be tested by the vertical slice; this architecture does not convert that hypothesis into a validated product fact.

Clio-native relationships may provide authoritative association. Outlook evidence requires association logic using the current conceptual hierarchy:

1. Explicit matter identifier.
2. Existing filing or tagging metadata.
3. Known matter participants.
4. Conversation relationships.
5. Content, entity, or context inference.

Participant matches generate candidates; they do not necessarily prove matter membership. Ambiguous associations must be allowed to remain ambiguous.

### 4. Evidence Normalization and Provenance

Normalize heterogeneous artifacts into a common conceptual evidence representation while preserving:

- Original source identity and artifact identity.
- Matter-association method, status, and explanation.
- Authorization context.
- Temporal information.
- Attachment and parent relationships.
- Retrieval information.
- References to the original source.

Preserve both:

- **Claim provenance:** Why does MatterMind believe a particular claim?
- **Retrieval-scope provenance:** What evidence universe was available when the reconstruction was generated?

### 5. Operational-State Reconstruction

Transform matter-associated evidence into a defensible reconstruction of current operational state:

```text
evidence
→ operational events
→ chronology
→ relationships and state transitions
→ supersession
→ current-state claims
```

This is not ordinary document summarization.

### 6. Status Brief Assembly and Validation

Produce the structured Matter Status Brief. Each material claim must be supported by inspectable evidence or explicitly represented as inference, conflict, uncertainty, or unknown.

Validation is a responsibility distinct from unconstrained natural-language generation.

### 7. Evaluation and Observability

Support evaluation of intermediate failures rather than judging only whether final text looks plausible. Evaluation dimensions include:

- Retrieval correctness.
- Wrong-matter contamination.
- Material evidence omissions.
- Event-extraction correctness.
- Supersession and current-state correctness.
- Grounding and claim-to-evidence alignment.
- Uncertainty and abstention behavior.
- Conflict handling.
- Usefulness.
- Eventual comparison of human reconstruction time with MatterMind orientation time.

## Conceptual request lifecycle

```text
User explicitly selects matter
→ establish authoritative matter identity
→ establish authenticated user
→ verify matter access
→ establish authorized evidence scope
→ retrieve deterministically associated Clio evidence
→ retrieve authorized Outlook candidate evidence
→ determine matter association for external evidence
→ reject, preserve as ambiguous, or accept candidate evidence
→ normalize accepted evidence
→ preserve association provenance
→ preserve retrieval-scope provenance
→ construct authorized matter evidence set
→ perform operational-state reconstruction
→ generate structured candidate claims
→ validate claim/evidence relationships
→ assemble Matter Status Brief
→ return inspectable result
```

Retrieval and matter association are deliberately separate. Discovery of an artifact is not proof of matter membership.

## Conceptual domain objects

These objects describe the domain language and information the architecture must preserve. They are not final database schemas or implementation interfaces.

### Matter Context

Represents:

- Requesting user.
- Authoritative matter ID.
- Matter number and name.
- Client.
- Known parties and participants.
- Request timestamp.
- Requested operation.

### Retrieval Scope

Represents the evidence universe available to a request:

- Authorized sources searched.
- Sources unavailable because of authorization.
- Sources outside V1 scope.
- Retrieval timestamp and context.

### Evidence Item

Represents a source artifact available to reasoning. Conceptually preserves:

- MatterMind evidence identity.
- Source system and original artifact identity.
- Artifact type.
- Matter association, method, strength or status, and explanation.
- Authorization context.
- Timestamps.
- Normalized content.
- Attachment and parent relationships.
- Original source reference.
- Retrieval metadata.

### Operational Event

Represents a derived interpretation of something operationally meaningful that happened. An event remains linked to the Evidence Item or Items from which it was derived.

One Evidence Item may produce multiple events, and multiple Evidence Items may support one event.

### State Claim

Represents something MatterMind believes may describe the current operational state, for example:

- `Waiting On = Client approval`
- `Next Action = Respond to opposing counsel`
- `Owner = Attorney`

State claims use the evidence states **Supported**, **Inferred**, **Conflicting**, and **Unknown**. A claim preserves its supporting events and evidence and any conflicting evidence.

MatterMind must not require or persist hidden model chain-of-thought. Concise, inspectable justification and provenance are appropriate.

### Supersession Relationship

Represents the distinction between stale historical state and genuine contradiction.

If a September 12 message says the firm is waiting on opposing counsel and opposing counsel responds on September 16, the earlier waiting state has been superseded.

If a client says approval was given on September 17 and an attorney says approval has not been given on September 18, the evidence may conflict. That is different from supersession.

### Matter Status Brief

The structured user-facing result contains:

- Matter and client identification.
- Current status.
- Last important event.
- Waiting on.
- Next action.
- Owner.
- Deadline or important date.
- Significant new information.
- Evidence and provenance for material claims.
- Relevant retrieval-scope information.
- Generation timestamp and context.

The deadline field may report dates that appear in evidence. MatterMind V1 does not determine authoritative legal deadlines.

## Provenance flow

The intended claim-provenance chain is:

```text
Matter Status Brief
→ State Claim
→ Operational Event
→ Evidence Item
→ Original Clio or Outlook artifact
```

A user should ultimately be able to inspect the source evidence supporting a material claim.

Matter-association provenance must also be retained so MatterMind can explain why an external artifact was treated as evidence for the selected matter. Retrieval-scope provenance records what evidence universe was and was not available to the request.

## Critical authorization and matter-isolation invariant

> A Matter Status Brief for Matter M may contain claims only when their source evidence was available within the requesting user's authorized evidence scope and was associated with Matter M under the V1 association rules.

Wrong-matter evidence, cross-matter contamination, and permission leakage are critical failures to prevent by design. Prompt instructions alone are not an acceptable enforcement mechanism for these boundaries.

## Conceptual reasoning pipeline

```text
Authorized Matter Evidence
→ Operational Event Extraction
→ Chronology
→ State Reconstruction and Supersession
→ Conflict and Unknown Identification
→ Structured Candidate Claims
→ Claim Validation and Provenance Check
→ Matter Status Brief
```

AI may be useful for:

- Natural-language interpretation.
- Operational-event extraction.
- Identifying meaningful state changes.
- Supersession reasoning.
- Conflict interpretation.
- Current-state reconstruction.
- Candidate-claim generation.

Deterministic software should handle where practical:

- Matter identity and authorization.
- Source isolation and artifact identity.
- Timestamp ordering.
- Provenance linkage.
- Structural or schema validation.
- Evidence-reference validation.
- Enforcement of V1 boundaries.

The exact model calls and orchestration mechanism remain undecided.

## Open architectural question: reasoning granularity

V1 has not finalized whether reasoning should use:

- One larger structured reasoning operation; or
- Staged reasoning through evidence, event extraction, timeline construction, state reconstruction, claim validation, and brief assembly.

The current leaning is toward a staged, or at least inspectable, pipeline because MatterMind is an evaluation-heavy MVP and intermediate visibility helps identify where failures occur. Implementation should permit experimentation rather than prematurely requiring an unnecessarily complex multi-call design.

## Synthetic-first implementation strategy

Initial development should use synthetic data rather than requiring live Clio or Microsoft 365 integrations. Application logic must not be tightly coupled directly to JSON fixture files. Synthetic providers and future real integrations should eventually satisfy the same conceptual source boundaries or contracts, but those contracts should not be over-designed before the vertical slice tests them.

The initial vertical slice should allow a user to:

1. Open MatterMind in a browser.
2. Select a synthetic matter.
3. Request a Matter Status Brief.
4. See the structured brief.
5. See **Supported**, **Inferred**, **Conflicting**, and **Unknown** evidence states.
6. Inspect the synthetic source evidence supporting material claims.
7. See relevant evidence-scope and provenance information.

The synthetic corpus should eventually test:

- Explicit matter IDs and matter numbers in email subjects.
- Unique participants and participants involved in multiple matters.
- Conversation or thread associations.
- Important evidence inside attachments.
- Ambiguous and irrelevant evidence.
- Similar client names across matters.
- Stale, superseded, conflicting, and missing evidence.
- Unauthorized evidence and evidence belonging to another matter.

Synthetic cases should have known ground truth so they can serve both development and evaluation.

## Explicit V1 non-goals

MatterMind V1 does not:

- Automate prospective-client intake.
- Determine legal conflicts.
- Determine authoritative legal deadlines.
- Autonomously create obligations.
- Create tasks, send email, modify calendars, assign work, update documents, or update Clio.
- Act as generalized firm-wide AI chat or unrestricted knowledge search.
- Draft client communications.
- Run background autonomous agents or proactively monitor matters.
- Promise universal document ingestion.
- Provide analytics or dashboarding.
- Replace Clio or become another system of record.

## Technology decisions not yet made

The following remain undecided:

- AI or model provider and exact model.
- Vector database or embeddings strategy.
- Retrieval-augmented generation framework.
- Agent framework.
- Cloud provider and production deployment architecture.
- Queue or background-job infrastructure.
- Final database schema.
- Final provider interfaces or contracts.
- Number of model calls.
- Exact prompt architecture.

Technology selection should follow demonstrated requirements rather than precede them.

## Architecture Phase 1 checkpoint

**Complete enough to begin implementation.**

This does not mean the architecture is final. The project has enough architectural definition to begin a synthetic vertical slice and use implementation and evaluation findings to refine the design.

## Next phase: MatterMind V1 — Synthetic Vertical Slice

The next phase is a thin end-to-end implementation against synthetic data. It should test the architecture's boundaries and core product outcome without requiring live source-system integrations.

Implementation does not begin as part of this documentation handoff.
