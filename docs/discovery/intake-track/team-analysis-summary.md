# Intake: Team Analysis Summary

**Status: DISCOVERY TRACK. NOT APPROVED FOR IMPLEMENTATION.** See [`README.md`](./README.md).

This file condenses the intake team's working files, written Oct 2, 2026: three independent analyses, four cross-challenges, and Filecard's citation audit. The working files are not committed. Line cites such as `[002 L55]` refer to the `docs/discovery/` records as of commit `5c9015c`. Clio claims are **UNVERIFIED**: they come from Clio's public docs, read Oct 2, 2026, and say nothing about this firm's plan or configuration.

## 1. Who looked at what

| Member | Angle | Main output |
| --- | --- | --- |
| Filecard | Workflow record; citation audit | [`workflow-reconstruction.md`](./workflow-reconstruction.md); audit of 428 line cites and 118 quoted spans across the analyses |
| Recondo | Operations and business problem; Clio public-doc research | Seven lenses; Clio feature map (problem → native feature → verdict); ranked top 3 |
| Mainframe | Systems and automation | Seven lenses; read-only "Intake Packet" sketch; deterministic rules; integration points |
| Dial-Tone | Failure modes and verification | Missed-conflict, dropped-lead and stale-record scenarios; 14 automation candidates rated by false-negative risk; safety/testability verdicts on 23 V1 candidates |

## 2. Where the team agreed

- **FACT:** Website data is re-keyed from Outlook into Clio by hand, and manual entry has produced wrong phone numbers, misspelled names and duplicate contacts, e.g. "Robert Smith" vs "Bob Smith" [002 L51–55].
- **FACT:** Parties have occasionally been identified after the original conflict check, and attorneys have asked whether particular people were checked [002 L64–67].
- **FACT:** The post-decision Clio update "does not happen consistently" [002 L98]; an unrecorded decision still looks pending [003 L82]; intake then chases status by hand [002 L99–100].
- **OBSERVATION:** Workarounds cluster at transitions between people (claim, assign, notify, decide, schedule), not in Clio's record functions [002 L154–156; 003 L129].
- **CONSTRAINT:** Conflict determination, conflict-search name selection, attorney assignment and accept/decline stay human [001 L43; 002 L78, L145; 003 L147].
- **CONSTRAINT:** No new independent system that employees must maintain separately [001 L63]. Do not describe Clio as failing or rejected [003 L151].
- **OBSERVATION:** No volume, frequency or timing figures exist. David's 5–10 / 20+ minute review times are estimates that must not be used for ROI [003 L53–54].
- **OBSERVATION:** Two attributions to Rachel can't be traced to 001: "Information is not consistently returned to Clio." [002 L205] and "Where are we on this matter?" [003 L109]. All three analysts flagged them and none used them. Stale Clio state rests on Maria and David alone.

## 3. Distinct contributions

- **Recondo.** Mapped 17 observed problems to Clio features. Verdict: the post-handoff problems look like configuration/adoption gaps; the front-door problems are config gaps only if the firm buys Grow; the genuine gaps are attorney selection, fuzzy-duplicate prevention at creation, filing from the shared mailbox, time-based alerts, and feeding suggested names into a conflict check. Flagged the over-build temptation: an AI intake brief for attorneys.
- **Mainframe.** Proposed the read-only Intake Packet (parsed fields with provenance, duplicate-contact candidates, party worksheet, attachment manifest). Listed what to refuse to automate. Mapped which active-matter V1 patterns carry over: provenance, authorization first, synthetic first, unknown is valid. The event, supersession and current-state pipeline does not carry over.
- **Dial-Tone.** Main point: for conflict work the false negative is the cost that matters, and an assist tool's misses look like a clean result. The only catch mechanism described is attorneys happening to ask [002 L67]. The only lost-lead detector is the prospect calling back [002 L36], so silent drops go uncounted.
- **Filecard.** Built the KNOWN / ASSUMED / GAP record (17 gaps) and audited the analyses. Most common defect across all three: frequency inflation ("occasionally", "sometimes", "not consistently" turned into "often").

## 4. Disagreements

| # | Topic | Positions | Outcome in the proposal | Still open? |
| --- | --- | --- | --- | --- |
| D1 | Config gap or build? | **Recondo:** post-handoff pain is Clio configuration and habit; build only a capture bridge, and only if no Grow. **Mainframe:** no interview mentions Pending, stages or notify settings, so "config gap" is a HYPOTHESIS, and config can't reach the front door. **Dial-Tone:** stage-triggered task lists may fail when the responsible attorney is missing (UNVERIFIED). | Both: Part A (config recommendations) plus Part B (Packet) | Yes. Recondo later retracted part of it: Grow is buy-vs-build, stages are plan-gated (Signature+), and "adoption gap" is an unproven bet. |
| D2 | Recondo's count | Recondo scored both approaches on 15 FACT problems. The Packet touches more (7 vs 3), but neither of the two problems corroborated by two roles. Recondo's original #1 hits both. | Accepted that the two approaches work on opposite ends of the pipeline and don't conflict once MatterMind writes nothing | Mainframe: corroborated by two people is not the same as large; frequency is unknown |
| D3 | Ranking conflict coverage | Recondo first ranked it 3rd ("no harm is known" [002 L66]), then moved it to 2nd after Dial-Tone's point that absence of detection is not absence of harm | Not ranked in the proposal | Yes. Dial-Tone: the ranking is Drew's decision, not something the evidence settles. |
| D4 | Packet review state | Recondo: party-review status and Search Coverage are a second record [001 L63–64] | Mainframe dropped them; V1 holds no workflow state | No |
| D5 | Coverage flag | Mainframe rule 5 (accepted minus searched). Dial-Tone: the "searched" input is hand-set or unavailable, so it can show a false "searched". | Out. No 'cleared' / 'complete' state anywhere. | No |
| D6 | AI name suggestions | Maria asked for it. Recondo: drop the feature, keep the bar. Mainframe: cheapest synthetic gate (~25 inquiries, two-layer labels, 100% recall, provenance as a hard gate). Dial-Tone: fails safety unless the manual read stays mandatory. | Gated V1.1 candidate | Yes. Drew decides whether, and who writes the seeded set. |
| D7 | Dial-Tone's verification bar | Its original bar (historical replay, shadow mode, matching a human baseline) can't run on synthetic data and there is no baseline [002 L188]. Mainframe called parts of it too strict and parts too loose (no provenance gate, no scanned PDFs, no authorization check). | Split: synthetic hard gates prove the logic; real-data gates come before reliance | No |
| D8 | Clio write | Mainframe: read-only V1, dry-run payload. Recondo: "no Clio writes" is the active-matter V1's non-goal, not an interview constraint; a confirmed write may honour "no second system" better. | Dry-run only; V2 is Drew's decision | Yes (Q-E) |
| D9 | Decision-capture UI | Recondo and Dial-Tone proposed it. Mainframe: one more channel attorneys can skip, cause unknown [003 L165]. | Out; Recondo withdrew | No |
| D10 | Claim lock | Recondo and Dial-Tone proposed it. Mainframe: the lock state lives outside Clio [001 L63]. | Out; ownership display deferred | No |
| D11 | Document filing | Recondo proposed automatic filing. Mainframe and Dial-Tone: phone-path association is a judgment [002 L111]; a misfile could be a silent confidentiality breach (HYPOTHESIS). | Out; the Packet only lists attachments | No |
| D12 | "No lost inquiries" | Recondo 2.12 read the evidence as "delay, not loss". Dial-Tone: loss can't be seen by the person who lost it. | Recondo conceded: FACT, no *known* loss [002 L37]; OBSERVATION, loss is currently undetectable | No |
| D13 | Reconstruction details | Dial-Tone: C2's mechanism (global search vs the Conflict Check feature) should be a GAP, and W7 → C1 ordering is ASSUMED. Recondo: C13's actor ("Attorney (implied)") should be a GAP. | The proposal's §1 table adopts the C2 GAP and W7 ASSUMED | Yes. [`workflow-reconstruction.md`](./workflow-reconstruction.md) still shows C2 as KNOWN, W7 → C1 as a solid step, and C13's actor as "Attorney (implied)". Filecard did not adopt these three points. |
| D14 | Reconstruction corrections that were adopted | Filecard's C10 "or" became "and/or" (new gap G17). The C5 trigger moved off attorney review. New gap G16 (attorney access to originals). | Adopted in the reconstruction | No |

## 5. Dial-Tone's verdict tally (23 candidates)

- Safety: 10 PASS / 13 FAIL. Testability: 10 PASS / 13 FAIL.
- **Both PASS:** parsed form fields (read-only), duplicate-contact candidates (never merged), read-only ownership display, aging alerts, attachment manifest from the inquiry email, and authorization before parsing with retrieval-scope labels.
- FAILs that flip to PASS under a stated condition: claim lock paired with aging alerts; name suggestions with a mandatory manual read; re-run and coverage flags only as one-way warnings fed by Clio's own check record.

## 6. Filecard's citation audit

- Line-cite mismatches: Recondo 1 of 202; Dial-Tone 0 of 226. Mainframe cites by section only.
- **CONFIRMED:** the 002 L205 attribution to 001 is not in 001. It went no further: no analysis used it as evidence.
- MEDIUM findings: Recondo's config-gap verdict assumes a Pending-status Manage matter and the firm's tier (G3 and plan are open); Recondo misquoted Rachel's constraint; Mainframe used 004 three times, not once; Mainframe's 004 quote is about active-matter filing, not intake tasks; Dial-Tone M3 merged two separate facts into "a name… is never searched".
- Ten verified facts the reconstruction had missed were added to it. None changed a step's KNOWN / ASSUMED / GAP status.
