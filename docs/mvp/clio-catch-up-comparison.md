# Clio Catch Up Comparison

## Purpose and audience

This document distinguishes between Clio's "Catch up" feature and MatterMind V1's Matter Status Brief to support honest product positioning and avoid misleading claims.

MatterMind is a simulated learning and portfolio product. It is not affiliated with Clio or any real law firm. This comparison exists because the two products operate in adjacent territory (matter-status understanding), and clear differentiation helps establish MatterMind's distinct value proposition and prevents confusion about what MatterMind V1 does and does not attempt to replace.

This document is required before additional slot-derivation PRs per Drew's October 2026 operating plan.

## What Clio Catch up is

Clio "Catch up" is an AI-generated summary widget inside the Clio Manage matter dashboard. It summarizes recent activity (documents, communications, matter updates) across the matter's tabs so users can get current without opening each section individually.

As documented in Clio's help resources (Matter Dashboard + AI Features in Clio Manage, updated approximately September 2026):

- **Beta status:** Catch up is in Beta. Clio instructs users to review the summary against the matter before relying on it for client work or deadlines.
- **Plan availability:** Available on select Clio plans; requires Clio AI features enabled for the firm.
- **Refresh behavior:** Refreshes automatically; an indicator shows whether the summary is current.
- **Feedback:** Users can provide thumbs-up/thumbs-down feedback.
- **Integration context:** Catch up operates inside Clio Manage (the system of record UI), not as a separate reconstruction product.
- **Related AI features:** Clio AI Launchpad supports "catch up on a matter" queries and matter questions; AI Actions suggest next steps (drafting, billing, scheduling); all AI features respect Clio Manage permissions and do not surface unauthorized matters.

Clio Catch up helps users orient themselves to a matter by summarizing activity already recorded inside Clio Manage.

## What MatterMind V1 is trying to be

MatterMind V1 is a **read-only, evidence-grounded active-matter status reconstruction tool**. Given one explicitly selected matter, MatterMind retrieves information from a deliberately constrained set of authorized sources and produces a structured reconstruction of the matter's current operational state.

Key characteristics:

- **Output structure:** Fixed Matter Status Brief slots (last significant event, waiting on, next action, owner, important date, significant new information, current status), with evidence and unknowns for each slot.
- **Grounding posture:** Material claims must be inspectable against source evidence. Uncertainty and abstention are valid outcomes when evidence is insufficient or conflicting.
- **Read-only:** MatterMind takes no autonomous operational actions. Clio remains the system of record.
- **Source boundary hypothesis (unproven):** MatterMind V1 intends to reconstruct state from the selected Clio matter and its associated Clio evidence, plus matter-relevant email and attachments in the requesting user's authorized Microsoft 365 scope (see [mvp-selection.md](./mvp-selection.md) and [v1-technical-feasibility.md](./v1-technical-feasibility.md)). This remains a hypothesis to validate, not a proven-sufficient boundary.
- **Operational reasoning:** Evidence flows through extraction, chronology, supersession, and current-state reasoning (see [mattermind-v1-architecture.md](../architecture/mattermind-v1-architecture.md)). Historical events remain valid even when later events supersede their operational significance.
- **Current implementation status:** The Synthetic Vertical Slice implements deterministic operational-event extraction. Four slots (current-status, last-important-event, waiting-on, and next-action) are now derived from operational events using deterministic supersession logic. The other three Matter Status Brief slots remain predefined synthetic output. Full current-state reasoning across all slots is not yet implemented.

MatterMind prioritizes evidence-grounded status reconstruction over activity summarization.

## Side-by-side differences

| Dimension | Clio Catch up | MatterMind V1 |
| --- | --- | --- |
| **Job to be done** | Summarize recent activity across matter tabs so users can get current without opening each section. | Reconstruct the current operational state of a matter from evidence, with traceable grounding and explicit uncertainty. |
| **Output shape** | Natural-language summary of recent activity. | Fixed slots (last event, waiting on, next action, owner, deadline, new info, status) with evidence and unknowns per slot. |
| **Grounding / provenance** | Summary widget; user reviews against matter for verification. | Material claims linked to inspectable source evidence; unknowns explicitly surfaced. |
| **Supersession / stale state** | Summarizes recent activity; supersession is implicit in the summary. | Explicit supersession reasoning: later events may supersede earlier operational significance. |
| **Uncertainty / abstention** | Beta label; users should verify before relying. | Unknown, Inferred, Conflicting, and Supported evidence states are first-class outputs. |
| **Source boundary** | Clio Manage matter data (documents, communications, matter updates). | Hypothesis: selected Clio matter + associated Clio evidence + matter-relevant email/attachments in authorized Microsoft 365 scope. Teams messages excluded from V1. (Unproven sufficiency.) |
| **Write vs read-only** | Read-only summary; no operational actions. | Read-only; no autonomous actions. Clio remains system of record. |
| **Action suggestions** | Clio AI Actions suggest next steps (drafting, billing, scheduling). | MatterMind V1 reports observed next action and owner from evidence; it does not generate action suggestions. |
| **Evaluation risk focus** | Activity summary correctness; users verify before relying. | Wrong-matter contamination, authorization leakage, unsupported assertions, stale state, material omissions, weak citations. (See [v1-success-and-risk.md](./v1-success-and-risk.md).) |
| **Integration posture** | Inside Clio Manage dashboard; integrated with Clio AI Launchpad and AI Actions. | Standalone reconstruction; Clio remains system of record; no replacement intent. |

## Overlap and non-goals

MatterMind V1 should **not** claim to replace or improve upon:

- Clio Catch up's activity summary inside the Clio Manage system of record.
- Clio AI Actions' next-step suggestions (drafting, billing, scheduling).
- Clio AI Launchpad's matter queries and conversational context.
- Clio Manage's authoritative matter records, permissions enforcement, or operational workflows.

Where the products overlap:

- Both help users understand a matter's current state faster than manual reconstruction.
- Both are read-only (no autonomous operational actions).
- Both respect underlying permissions (Clio Manage permissions; MatterMind relies on source-system authorization and may narrow but never expand it).

MatterMind's differentiation is in its focus on **evidence-grounded current-state reconstruction with explicit uncertainty**, structured slot output, and a deliberate cross-system source hypothesis (Clio + email), rather than activity summarization within Clio Manage alone.

## Implications for V1

1. **UI copy must remain honest:** MatterMind should describe itself as evidence-grounded current-state reconstruction, not as "Clio but better" or a Clio Catch up replacement.
2. **Derived vs predefined distinction:** As more Matter Status Brief slots become derived from operational events, the UI should reflect which slots are actively reconstructed and which remain synthetic placeholders. The current increment derives four slots (current-status, last-important-event, waiting-on, and next-action); the other three slots are still predefined.
3. **Avoid misleading claims:** MatterMind should not market itself as improving on Clio's activity-summary features or Clio AI Actions.
4. **Update this comparison:** As MatterMind's capabilities evolve and more slots become derived, this comparison should be revised to reflect actual product behavior rather than architectural intent.
5. **Positioning:** MatterMind complements Clio by reconstructing current state from a broader evidence boundary (Clio + email hypothesis), with explicit grounding and uncertainty. It does not replace Clio Manage or Clio AI features.

## Decisions recorded

The following architecture decisions were confirmed by Drew on October 4, 2026, finalizing V1 source boundaries and evaluation scope:

### Teams messages

**Decision:** Microsoft Teams messages are **not included in V1**. Teams messages are deferred to a later version.

The V1 evidence boundary hypothesis remains: selected Clio matter + associated Clio evidence + matter-relevant email and attachments in the requesting user's authorized Microsoft 365 scope.

**Confirmed by Drew, October 4, 2026.**

### Per-item permissions

**Decision:** V1 relies on source-system permissions only (Clio, Microsoft 365). MatterMind does not implement per-item access-control logic at the MatterMind layer in V1.

MatterMind must respect source-system permissions and never broaden a user's access. MatterMind-specific controls may be added later only if a real need emerges.

**Architectural rule:** "MatterMind permissions may narrow source permissions, but never expand them."

**Confirmed by Drew, October 4, 2026.**

## Maintenance

This document should be updated whenever:

- Clio releases significant changes to Catch up, AI Actions, or related AI features.
- MatterMind's slot-derivation status changes (more slots become derived vs predefined).
- The V1 source boundary hypothesis is validated, refined, or replaced.
- New evaluation findings materially change MatterMind's risk posture or differentiation.
