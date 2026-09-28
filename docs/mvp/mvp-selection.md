# MatterMind MVP Selection

## Decision

MatterMind V1 should focus on **read-only active-matter status reconstruction**.

### Product hypothesis

Given one selected matter and an authorized, defined collection of matter-related sources, MatterMind can produce a concise current-state brief whose material claims are traceable to supporting evidence, while clearly identifying uncertainty and taking no autonomous action.

This is a product selection, not an architecture decision.

## Why this workflow was selected

Active-matter status provides the strongest balance of:

- Meaningful pain observed across legal-operations, attorney, and paralegal roles.
- Directly demonstrated matter-reconstruction work.
- A natural unit of work: one selected matter.
- A useful read-only output that does not modify operational systems.
- Controllable risk when claims are sourced and uncertainty is explicit.
- High learning value around retrieval, provenance, permissions, structured output, ambiguity, and user trust.

Prospective-client intake appears easier to narrow, but discovery did not establish sufficient pain, volume, or return on investment to make it the strongest first choice.

Deadlines and follow-up involve substantial cognitive work and potentially serious consequences, but the pain level, volume, acceptable error rates, and value of candidate detection alone remain insufficiently understood. The reliability burden also makes this a poor first workflow.

## Intended V1 output

For one selected matter, V1 should produce a fixed current-state brief containing:

- Last significant event.
- What the firm is waiting on.
- Next action.
- Owner of the next action.
- Known deadline or date requiring attention.
- Significant recently received information.
- Source evidence for every material claim.
- Explicit unknown or insufficient-evidence states.
- The freshness or time boundary of the reviewed information.

The exact source boundary is not yet final. Technical feasibility refined the working hypothesis to the selected Clio matter and its deterministically associated Clio evidence, plus matter-relevant Outlook email and attachments within the requesting user's authorized Microsoft 365 evidence scope. This remains a hypothesis to validate, not a proven-sufficient boundary. See [`v1-technical-feasibility.md`](./v1-technical-feasibility.md#refined-v1-source-boundary-hypothesis).

## Explicit exclusions

V1 should not:

- Write to Clio, Outlook, calendars, tasks, documents, or other operational systems.
- Become another system of record.
- Operate as a universal firm-wide assistant.
- Automatically summarize every matter.
- Make legal judgments or recommendations.
- Determine authoritative legal deadlines.
- Accept or decline prospective matters.
- Resolve conflicting sources silently.
- Present unsupported conclusions as facts.
- Hide uncertainty to produce a cleaner answer.
- Include intake automation or obligation detection as adjacent features.
- Expand across all practice groups before the bounded workflow is evaluated.

## Core product behaviors

### Source grounding

Material claims must be connected to inspectable source evidence. Users need to be able to answer:

> Why does the system believe this?

Source verification is a core trust behavior, not a presentation enhancement.

### Uncertainty and abstention

MatterMind must be able to report that the current state is unknown, insufficiently supported, or contradicted by available sources. A qualified, evidence-bound answer is preferable to an unsupported definitive answer.

### Read-only operation

Read-only operation makes early failures observable and reversible. An incorrect reconstruction can be inspected and corrected without altering calendars, tasks, deadlines, documents, or authoritative matter records.

Read-only operation reduces action risk but does not make inaccuracies harmless. Evidence traceability and uncertainty handling remain necessary.

## Assumptions to validate before implementation

1. **Pain:** Matter reconstruction happens often enough and consumes enough professional time to justify intervention.
2. **Source sufficiency — unresolved (A3):** A bounded source set contains enough evidence to produce a useful current-state brief. Feasibility established retrievability, not consistent sufficiency; realistic cases must test this assumption.
3. **Matter association — partially supported (A4):** Clio-native evidence can use authoritative matter relationships. Email and attachment association remains a significant product and technical challenge.
4. **Permissions — partially supported (A10):** Source-system authorization mechanisms can support least privilege, but authorization boundaries can reduce evidence completeness. Authorization and completeness must be evaluated separately.
5. **Evaluation:** A qualified reviewer can determine whether a brief is correct, complete, current, and supported.
6. **Trust:** Inspectable evidence and explicit uncertainty increase willingness to use the result.
7. **Scope:** A single matter and limited time window are useful without requiring firm-wide search or complete historical reconstruction.
8. **Value:** Faster orientation improves response time, reduces duplicate work, or increases professional capacity rather than merely producing a polished summary.

## Candidate disposition

- **Selected:** Active-matter status reconstruction.
- **Reserved:** Prospective-client intake, pending stronger evidence of volume, pain, or cost.
- **Deferred:** Deadlines and follow-up, pending better evidence about pain, volume, evaluation tolerance, and human-review controls.

## Next step

V1 success outcomes, evaluation principles, and the product risk model are defined in [`v1-success-and-risk.md`](./v1-success-and-risk.md).

The technical feasibility investigation is complete and recorded in [`v1-technical-feasibility.md`](./v1-technical-feasibility.md). Its checkpoint is **Proceed to Architecture**.

The next phase is MatterMind V1 Architecture. It must begin from the established product scope, success outcomes, risk model, and requirements earned through feasibility rather than from preferred technologies.
