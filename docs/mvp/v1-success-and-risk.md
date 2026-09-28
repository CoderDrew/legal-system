# MatterMind V1 Success Outcomes and Risk Model

## Purpose and status

This document records the product-level success outcomes and risk model established after selection of the MatterMind V1 MVP. It constrains future technical decisions; it does not define an implementation architecture.

MatterMind V1 remains a **read-only, evidence-grounded active-matter status reconstruction tool**. Given one explicitly selected matter, it retrieves information from a deliberately constrained set of authorized sources and produces a structured reconstruction of the matter's current operational state. Clio remains the system of record, and V1 takes no autonomous operational actions.

## Discovery basis

The repository's discovery records remain the source of stakeholder facts, observations, hypotheses, and open questions. In particular, active-matter discovery documented the orientation questions users need answered and the manual effort involved in reconstructing current state across sources. Those findings informed the product decisions below, but they are not retroactively converted into requirements or presented as proof that unvalidated assumptions are true.

## Product decision: V1 success outcome

> An authorized user can select an active matter and understand its current operational state faster than they can by manually reconstructing it, while being able to verify important claims against source evidence.

This is the primary product-level definition of success. Success is not merely the technical generation of a Matter Status Brief. The brief must make the user's orientation and reconstruction task easier without introducing unacceptable risk.

## Success framework

| Dimension | V1 success outcome | Key validation focus |
| --- | --- | --- |
| **Usefulness** | Users can orient themselves to a matter without independently reconstructing the entire matter. | After reading the brief, can the user correctly orient themselves without repeating the full manual process? |
| **Grounding** | Material factual claims are supported by inspectable evidence or explicitly qualified. | Can the system answer, “Why does it believe this?” |
| **Uncertainty** | Unsupported or ambiguous states are surfaced as inferred, conflicting, or unknown rather than asserted as fact. | Does the brief abstain or qualify claims when the evidence does not justify certainty? |
| **Retrieval** | Evidence belongs to the selected matter and sufficiently represents the relevant state. | Did the system retrieve material evidence and exclude unrelated-matter evidence? |
| **Efficiency** | MatterMind materially reduces the time and effort required to understand current matter state. | How does MatterMind orientation time compare with measured manual reconstruction time? |

Operational criteria such as latency, uptime, cost, security controls, and infrastructure performance will eventually matter, but they are not substitutes for these product-success outcomes.

### Usefulness

The Matter Status Brief should help the user answer:

- What is the current status?
- What was the last important event?
- What is the firm waiting on?
- What appears to be the next action?
- Who appears to own that action?
- What deadline or important date is currently relevant?
- What significant new information has changed the matter?

A technically correct output that still forces the user to perform the full manual reconstruction is not a successful product outcome.

### Grounding

Every material factual claim must either:

1. Have inspectable supporting evidence; or
2. Be explicitly identified as inference, uncertainty, conflict, or insufficient evidence.

For example:

> **Waiting on:** Revised settlement documents from opposing counsel.  
> **Evidence:** Email from Jane Smith — September 21, 2026 — [View source]

Source evidence is part of the product contract, not merely a user-interface enhancement.

### Uncertainty and abstention

MatterMind should distinguish conceptually between:

| State | Meaning |
| --- | --- |
| **Supported** | Evidence directly supports the statement. |
| **Inferred** | Available evidence reasonably implies the state but does not explicitly establish it. |
| **Conflicting** | Available evidence supports different conclusions. |
| **Unknown** | Available evidence is insufficient to determine the state. |

“Unknown” or “insufficient evidence” is valid successful behavior. Unsupported certainty is a more serious failure than appropriately declining to make a claim. Evaluation must distinguish supported and correct statements, reasonable inferences correctly labeled as such, correct abstentions, and unsupported claims presented as fact.

### Retrieval correctness

Retrieval correctness precedes reasoning quality. Evaluation must distinguish at least:

1. Relevant evidence successfully retrieved.
2. Material evidence missed.
3. Evidence from an unrelated matter incorrectly included.

The third case is particularly serious. A model can reason correctly over the evidence it receives and still produce an unsafe result if that evidence belongs to the wrong matter. Matter association is therefore a distinct quality dimension, not part of a generic measure of AI accuracy.

Both precision and recall matter, but their consequences may not be symmetrical: irrelevant evidence may be distracting, while a missed item that materially changes current state can be substantially more harmful.

### Efficiency

Evaluation should eventually compare **manual reconstruction time** with **MatterMind orientation time**. No quantitative improvement target is established yet because a reliable baseline for manual reconstruction does not exist. Establishing that baseline is future validation work.

A success criterion is not the same as an arbitrary KPI.

## Evaluation principle: consequences matter

MatterMind quality must not be reduced to a single generic “accuracy” score. Different error classes have different consequences.

For example, a system that answers 95 percent of questions but occasionally invents an unsupported next action may be less successful than one that answers 82 percent, appropriately reports unknown states, and grounds the answers it does provide. Evaluation must account for the consequences of each error class rather than measuring only answer frequency or generic correctness.

## Product decision: V1 risk model

MatterMind's product promise is approximately:

> Given the correct selected matter and authorized evidence, reconstruct its current operational state without misleading the user.

The risk model focuses on failures that threaten this promise.

| Severity | Failure class | Example and consequence | Required posture |
| --- | --- | --- | --- |
| **Critical** | Wrong-matter evidence | An email or document from another matter produces a plausible but incorrect reconstruction. | Treat cross-matter contamination as effectively zero-tolerance in V1 and prevent it by system design. |
| **Critical** | Permission or authorization leakage | A user sees evidence from a matter they are not authorized to access, exposing confidential or privileged information. | Preserve authorization throughout retrieval and presentation; warnings and confidence labels are not adequate mitigations. |
| **High** | Unsupported assertion | The brief states “Waiting on opposing counsel” without supporting evidence. | Label inference or uncertainty when direct evidence is absent, and evaluate unsupported assertions explicitly. |
| **High** | Stale or superseded state | Older evidence says the firm is waiting on opposing counsel, while newer evidence shows it is waiting on client approval. | Evaluate whether newer evidence changes or supersedes older state. |
| **High** | Material omission | Correct statements omit a recent message that materially changes the state or establishes an important date. | Evaluate whether the system found the material information it should have found, not only whether generated statements are correct. |
| **High** | Incorrect or weak citation | A citation is present but does not support its associated claim, creating false confidence. | Test citation support, not merely citation presence. |

### Risk hierarchy

**Critical — must be prevented by system design**

- Unauthorized information disclosure.
- Wrong-matter contamination.

**High — must be explicitly evaluated and controlled**

- Unsupported assertions.
- Stale or superseded state.
- Material omissions.
- Citations that do not support their associated claims.

**Manageable — product quality problems**

- An overly verbose Matter Status Brief.
- Minor irrelevant information.
- Imperfect wording.
- Redundant evidence.
- Useful information requiring an unnecessary extra click.
- Less-than-ideal formatting.

Manageable issues still matter, but they should not receive priority over failures that threaten correctness, confidentiality, or user trust.

## Product-engineering implication

> The most important V1 risks may not originate in the language model.

The system can fail before model reasoning begins if it retrieves evidence from the wrong matter, misses material evidence, ignores newer evidence that supersedes older evidence, violates authorization boundaries, or loses provenance between source retrieval and generated claims.

“Can the model generate a good summary?” is therefore not the primary technical question. A more important question is:

> Can MatterMind retrieve the right evidence, for the right matter, for the right authorized user, at the right time, and preserve enough provenance to justify its reconstruction?

This is the distinction between document summarization and operational-state reconstruction. Correctness includes matter association, authorization, completeness, currency, and genuine claim-to-source support.

## Decision boundaries and future validation

### Established product decisions

- The selected V1 remains read-only active-matter status reconstruction for one explicitly selected matter.
- Material claims require inspectable evidence or explicit qualification.
- Explicit uncertainty and abstention are valid, necessary outcomes.
- Wrong-matter evidence and authorization leakage are critical failures.
- Clio remains the system of record.
- V1 performs no autonomous operational actions.

### Assumptions requiring validation

The assumptions listed in [`mvp-selection.md`](./mvp-selection.md) remain open, including source sufficiency, reliable matter association, enforceable permission boundaries, reviewer agreement, user trust, bounded-scope usefulness, and realized time or capacity value.

### Future validation work

- Establish a reliable manual-reconstruction-time baseline before setting an efficiency threshold.
- Define representative evaluation cases and qualified review procedures.
- Measure material-evidence retrieval and material omissions as well as claim correctness.
- Test citation support, state supersession, uncertainty labeling, abstention, matter isolation, and authorization preservation.
- Determine acceptable thresholds based on risk consequences; do not infer them from this document.

No quantitative success threshold, source boundary, or acceptable error rate is established here.

## Why this document matters

The success framework defines what MatterMind must do well. The risk model defines what MatterMind must not do badly. Together, they establish product requirements that should constrain later technical feasibility investigation, architecture decisions, retrieval and permissions design, evaluation dataset creation, evaluation metrics, model selection, human-review experience, testing priorities, and implementation planning.

## Next phase: Technical feasibility investigation

The project has completed enough product definition to begin technical feasibility investigation. That investigation is not performed in this document.

The initial focus is:

> Can Clio provide the identity, context, relationships, data access, and permission boundaries needed to serve as MatterMind's trustworthy matter anchor?

Subsequent investigation will examine how external evidence such as email and attachments can be reliably associated with that matter.

Architecture should follow feasibility findings rather than precede them.
