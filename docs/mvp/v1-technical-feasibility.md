# MatterMind V1 Technical Feasibility

## Purpose and status

This document records the completed technical feasibility investigation for MatterMind V1. Its purpose was to determine whether the selected product is technically plausible and to identify constraints that a later architecture must satisfy.

The project checkpoint is **Proceed to Architecture**.

This conclusion does not mean MatterMind V1 has been proven to work. No architecture, implementation mechanism, technology vendor, platform, framework, database, deployment model, or quantitative threshold is selected here.

## Decision and evidence boundaries

| Category | Status in this document |
| --- | --- |
| **Discovery findings** | Remain in the discovery records and continue to describe observed stakeholder needs and work. |
| **Product decisions** | The selected read-only, evidence-grounded active-matter status reconstruction scope remains unchanged. |
| **Technical feasibility findings** | Record what the three feasibility spikes established and the constraints earned from them. |
| **Assumptions and hypotheses** | Remain unproven unless explicitly marked partially supported. |
| **Unresolved questions** | Become implementation and evaluation targets; they are not converted into facts. |
| **Future investigation** | Is identified without making architecture decisions in this phase. |

MatterMind V1 remains:

> A read-only, evidence-grounded active-matter status reconstruction tool.

Given one explicitly selected matter, MatterMind retrieves information from a deliberately constrained set of authorized sources and produces a structured reconstruction of the matter's current operational state. Material assertions should be traceable to supporting source evidence. Contradictory, stale, ambiguous, or insufficient evidence should result in explicit uncertainty rather than manufactured certainty.

Clio remains the system of record. MatterMind does not replace Clio and performs no autonomous operational actions.

## Spike 1: Clio as the matter anchor

### Question

Can Clio provide the identity, context, relationships, data access, and permission boundaries needed to serve as MatterMind's trustworthy matter anchor?

### Finding: Feasible, with remaining implementation validation

The feasibility investigation found that current Clio developer documentation describes stable matter identifiers, human-readable matter information, matter metadata, relationships, custom fields, matter-associated resources, application permissions, and authorizing-user permissions.

This makes Clio a plausible authoritative matter anchor for MatterMind:

```text
Selected Clio matter
├── authoritative matter identity
├── client and contact relationships
├── responsible users
├── matter metadata
├── custom fields
└── Clio-associated evidence
```

For evidence that Clio already associates with a matter through an authoritative relationship, MatterMind should preserve and use that relationship. It should not ask AI to infer a relationship that the source system already knows.

> **Deterministic relationships outrank inferred relationships.**

If Clio establishes that an artifact belongs to `matter_id = 12345`, that relationship is authoritative for MatterMind's matter association. The exact shape of a firm's Clio data remains an implementation validation item; a real deployment must inspect the firm's actual Matter schema, relevant custom fields, and workflows.

## Spike 2: Matter-to-email association

### Question

Given a selected Clio matter, can MatterMind reliably locate Outlook email and attachments belonging to that matter?

### Finding: Technically feasible, but association policy remains a core product and technical problem

The feasibility investigation found that current Microsoft documentation describes mechanisms for accessing or searching Outlook messages and retrieving message metadata, participants, conversation relationships, and attachments.

Unlike Clio-native resources, an Outlook email does not inherently belong to a Clio matter. MatterMind therefore cannot assume that a direct authoritative relationship exists.

### Proposed evidence-association hierarchy

MatterMind should prefer the strongest available association evidence. Confidence generally decreases down this conceptual hierarchy:

1. **Explicit matter identifier.** A subject such as `[2026-0042] Smith v. Jones - Revised Agreement`, where `2026-0042` is the authoritative Clio matter number, is a strong signal.
2. **Existing filing or tagging metadata.** If established workflows attach matter identifiers, categories, or other reliable metadata to email, MatterMind should prefer those relationships. Their existence must be verified for the actual firm.
3. **Known matter participants.** Clients, attorneys, opposing counsel, organizations, and other known participants can identify candidate evidence, but participant matching alone does not establish matter membership. A participant may be involved in multiple matters.
4. **Conversation relationships.** Once a message is strongly associated, its conversation or thread relationships may provide further evidence. Conversation membership retains the strength and limitations of its supporting association evidence.
5. **Content, entity, and context inference.** Only where stronger deterministic signals are insufficient should semantic or AI-assisted association consider content, entities, dates, matter descriptions, attachments, and related context. Inference must not silently convert ambiguity into certainty.

MatterMind should not be built around the premise “embed every email and let AI decide which matter it belongs to.” It should use the strongest deterministic relationship available first and use inference only where deterministic relationships stop.

### Evidence-association provenance

MatterMind may need to preserve why each artifact was considered evidence for a matter, such as:

- An authoritative Clio matter relationship.
- An explicit matter number.
- Existing filing metadata.
- A conversation relationship.
- A participant-based candidate association.
- An inferred content or context relationship.

The scoring or confidence mechanism remains unresolved and is not defined here.

## Spike 3: Authorization and evidence scope

### Question

When an authorized user requests a Matter Status Brief, what evidence is MatterMind entitled to retrieve and use?

### Finding: Feasible with an explicit V1 authorization boundary

The feasibility investigation found that Clio and Microsoft 365 provide source-system authorization mechanisms. Microsoft documentation describes delegated permissions as well as broader application-level access models. Broader organization-wide mailbox access is not part of MatterMind V1.

### V1 authorization policy

> MatterMind may only retrieve and use evidence that the requesting user is authorized to access through the underlying source system.

Source-system authorization remains authoritative. MatterMind does not broaden access merely because information may be relevant to a matter.

```text
Can the requesting user access the evidence?
└── Yes: Is the evidence relevant to the selected matter?
```

Authorization precedes relevance, not the reverse.

For V1, delegated and least-privilege access should be preferred wherever practical:

- **Clio:** Rely on applicable Clio authorization boundaries.
- **Microsoft 365:** Operate within the requesting user's authorized evidence scope. Authorized shared or delegated mail may be considered where the user already has access. Do not assume access to other users' private mailboxes.

Broader application-level, organization-wide mailbox access is explicitly deferred. A future enterprise deployment may investigate broader service access with appropriately constrained authorization, but V1 should not add it merely to increase retrieval completeness.

## Authorized evidence does not equal complete evidence

Successful retrieval does not prove evidence completeness.

For example, Karen's authorized evidence may contain a September 12 message saying the firm is waiting for opposing counsel, while Rachel's private mailbox contains a September 17 message saying the client approved revisions and the firm should respond. If Karen cannot access Rachel's mailbox, MatterMind may retrieve every artifact it is authorized to retrieve while still lacking the newest evidence.

Therefore:

- “No evidence found” does not necessarily mean “This did not happen.”
- “Latest evidence retrieved” does not necessarily mean “Latest evidence that exists.”
- Inability to access evidence must not be interpreted as evidence that the information does not exist.

This finding reinforces the existing stale-state, material-omission, uncertainty, and abstention requirements.

## Retrieval scope is part of provenance

The feasibility investigation expands provenance into two distinct requirements.

### Claim provenance

Claim provenance answers: **Why does MatterMind believe this claim?**

Example: a “Waiting on client approval” statement is supported by a September 17 email from the attorney to the client.

### Retrieval-scope provenance

Retrieval-scope provenance answers: **What evidence universe was available to MatterMind when it produced this reconstruction?**

A reconstruction may need to preserve that it searched the selected Clio matter, the requesting user's authorized mailbox, and an authorized shared mailbox, while other users' private mailboxes, unavailable sources, and sources outside the configured V1 boundary were not searched.

This example is not a final user-interface requirement. The requirement is that the retrieval scope remain knowable and available to the product.

## Current state is not the same as summary

MatterMind V1 is not merely a document summarizer. Consider this evidence:

- **September 12:** Waiting for opposing counsel.
- **September 16:** Opposing counsel sends revisions.
- **September 17:** The attorney reviews the revisions and requests client approval.

All three statements may be factually correct. A generic summary can include them all while still failing to identify the current operational state: **waiting for client approval**.

MatterMind must eventually be evaluated on the sequence from events, through chronology and supersession, to current operational state. Whether it can recognize when newer evidence supersedes older operational state is an unresolved evaluation requirement. The implementation mechanism is not selected here.

## Impact on the assumptions register

The corresponding assumptions in [`mvp-selection.md`](./mvp-selection.md) have been updated rather than copied into a competing register. The supplied feasibility brief identifies them as A3, A4, and A10; their prose equivalents in the existing register are source sufficiency, matter association, and permissions.

| Assumption | Status after feasibility | Finding |
| --- | --- | --- |
| **A3 — Limited sources contain enough information to reconstruct useful state** | **Unresolved** | Clio and Microsoft 365 can provide retrievable evidence, but the constrained V1 source set has not been shown to contain enough information for consistently useful reconstruction. Realistic cases must test it. |
| **A4 — Evidence can be reliably associated with the correct matter** | **Partially supported** | Clio-native evidence can use authoritative relationships. Outlook association remains a significant product and technical challenge and a major evaluation target. |
| **A10 — Required data can be accessed while respecting existing permissions** | **Partially supported** | Both source systems offer authorization mechanisms that can support least privilege. Authorization boundaries can reduce completeness, making authorization versus completeness a product and security constraint. |

## Refined V1 source-boundary hypothesis

> **Hypothesis:** The selected Clio matter and its deterministically associated Clio evidence, plus matter-relevant Outlook email and attachments available within the requesting user's authorized Microsoft 365 evidence scope.

This is the candidate V1 evidence boundary, not a proven product requirement. The MVP must test whether this source set is sufficient to produce useful matter-state reconstruction.

## Architecture Requirements Earned Through Feasibility

These are requirements and constraints that the eventual architecture must satisfy. They are not architecture selections.

1. Preserve authoritative matter identity.
2. Enforce source-system authorization.
3. Use least-privilege retrieval.
4. Prefer deterministic evidence association.
5. Support explicitly identified inferred association where necessary.
6. Preserve evidence-association provenance.
7. Preserve claim provenance.
8. Preserve retrieval-scope provenance.
9. Support chronological reasoning.
10. Detect when newer evidence supersedes older operational state.
11. Represent uncertainty and abstention explicitly.
12. Expose evidence conflicts rather than resolving them silently.
13. Preserve read-only V1 operation.
14. Isolate sources and prevent cross-matter contamination.
15. Support evaluation against known ground truth.

> **Retrieval correctness precedes reasoning quality.**

A model can reason perfectly over the wrong evidence and still produce an unsafe or incorrect result. The primary technical question is not simply, “Can the language model understand the documents?” It is:

> Can MatterMind retrieve the right evidence, for the right matter, for the right authorized user, at the right time, and preserve enough provenance to justify its reconstruction?

## Relationship to the V1 risk model

The feasibility findings reinforce the hierarchy in [`v1-success-and-risk.md`](./v1-success-and-risk.md):

- **Critical:** Wrong-matter evidence or cross-matter contamination; permission or authorization leakage.
- **High:** Unsupported assertions; stale or superseded state; material omissions; incorrect or weak citation support.
- **Manageable product quality:** Verbosity, minor irrelevant information, imperfect wording, redundant evidence, unnecessary interaction, and formatting issues.

The feasibility work refines these risks by establishing that association provenance, retrieval-scope provenance, authorization-before-relevance, and the distinction between authorized and complete evidence must be preserved. It does not replace the risk model.

## Synthetic-data development requirement

Early development should be possible against synthetic test data that mimics the relevant shape and relationships of the source systems. A live Clio tenant or production legal data should not be required for initial development.

Application logic should not be tightly coupled directly to JSON fixture files. A later implementation must define source or provider boundaries that allow synthetic providers and real integrations to satisfy the same conceptual contracts. Those interfaces are not designed here.

The future synthetic corpus should include:

- Easy explicit matter associations and matter numbers in email subjects.
- Unique participant associations and participants involved in multiple matters.
- Conversation or thread associations.
- Important evidence inside attachments.
- Ambiguous, irrelevant, stale, superseded, conflicting, and missing evidence.
- Same or similar client names across matters.
- Unauthorized evidence and evidence belonging to another matter.

It should support known ground truth for the actual current operational state, supporting evidence, stale evidence that should be superseded, expected unknown and conflicting states, and evidence that must never cross matter boundaries.

The corpus should eventually support both development and evaluation. It is not created as part of this documentation phase.

## Explicitly deferred from V1

- Organization-wide autonomous email access.
- Unrestricted cross-mailbox retrieval.
- Proactive matter monitoring or background agents watching matters.
- Automatic Clio updates or task creation.
- Autonomous legal deadline determination.
- Firm-wide semantic knowledge search.
- Every Microsoft 365 source.
- Universal document ingestion.
- Perfect email-to-matter classification.

These may be future investigation areas, but they are not necessary to validate the selected MVP hypothesis.

## Research basis

The feasibility investigation relied on current official documentation from:

- Clio Developer Documentation and the Clio Manage API documentation.
- Clio API permissions documentation.
- Microsoft Graph Outlook Mail documentation.
- Microsoft Graph and Search documentation for Outlook messages.
- Microsoft Graph permissions documentation.
- Microsoft Exchange Online Application RBAC documentation.

**TODO:** Add verified official source URLs to the repository's research notes. No source URLs were present in the repository when this document was created, so none are guessed here.

## Technical feasibility conclusion

### Proceed to Architecture

The narrow V1 appears technically plausible. The investigation established that:

- Clio can plausibly serve as the matter identity anchor.
- Outlook email and attachment retrieval is technically possible.
- Email-to-matter association requires an explicit policy and evaluation.
- Source-system authorization can support a least-privilege V1.
- Authorization and evidence completeness are separate concerns.
- Provenance must include claims, evidence association, and retrieval scope.
- Current-state reconstruction requires chronology and supersession reasoning rather than generic summarization.
- No fundamental integration blocker was identified within the investigated scope.
- Important assumptions remain to be tested during implementation and evaluation.

The most important remaining uncertainties are:

1. Does the constrained source set contain sufficiently complete evidence?
2. Can external evidence be associated with the correct matter reliably enough?
3. Can MatterMind distinguish current operational state from stale or superseded state?
4. Can authorization and provenance be preserved end to end?
5. Does the Matter Status Brief materially reduce human reconstruction effort?

These are MVP validation questions, not findings already established.

## Architecture handoff

Architecture Phase 1 is recorded in [`mattermind-v1-architecture.md`](../architecture/mattermind-v1-architecture.md). It uses the product scope, success outcomes, risk model, and feasibility findings as constraints rather than beginning with preferred technologies.

Its checkpoint is **Complete enough to begin implementation**. The architecture is not final, and the open reasoning-granularity question remains subject to experimentation.

The next phase is the MatterMind V1 synthetic vertical slice. No implementation is performed in this feasibility record.
