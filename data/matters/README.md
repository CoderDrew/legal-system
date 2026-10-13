# Synthetic adversarial corpus

Hand-written evaluation matters for MatterMind V1 current-state reasoning. Every case is fictional. None of this data comes from Clio, Microsoft 365, or any real client file.

Ground truth for all 7 brief slots was written from each scenario's intent **before** running the reasoners. If a reasoner disagrees, the ground truth stays put; the disagreement is a finding.

Smith v. Acme (`matter-2026-0142`) is the baseline default. It lives in `data/synthetic-matter.ts` and `data/synthetic-current-state.ts` and is not modified by this corpus.

| Matter | ID | Adversarial class |
| --- | --- | --- |
| Smith v. Acme | `matter-2026-0142` | baseline |
| Smith Property Acquisition | `matter-2026-0159` | cross-matter contamination |
| Chen Employment File | `matter-2026-0160` | missing evidence |
| Rivera v. Northwind | `matter-2026-0161` | conflicting evidence |
| Patel v. Harbor Logistics | `matter-2026-0162` | stale evidence (re-opened + continuance) |
| Alan Smith v. Westfield | `matter-2026-0163` | ambiguous identities |
| Al Smith Vendor Review | `matter-2026-0164` | cross-matter contamination + ambiguous identities |

Reasoning for a matter may consume only that matter's events. Loading the full corpus together must not change any matter's 7 slots.
