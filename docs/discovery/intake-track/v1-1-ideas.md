# Intake: V1.1 and Later Ideas

**Status: DISCOVERY TRACK. NOT APPROVED FOR IMPLEMENTATION.** See [`README.md`](./README.md).

- **CONSTRAINT:** Every item here is a HYPOTHESIS recorded for a possible later decision. None is approved, scheduled or designed. Intake itself is parked (option (c), Oct 2, 2026).
- Each idea assumes intake has been reopened first ([`reopening-research-plan.md`](./reopening-research-plan.md)).
- Every Clio or Grow capability is **UNVERIFIED** for this firm. Links are in [`reopening-research-plan.md`](./reopening-research-plan.md#3-cliogrow-capabilities-to-verify).

## 1. AI party-name suggestions (V1.1 candidate)

- **Why it exists.** FACT: Maria asked for help finding names in documents, with her review [002 L144, L146]. FACT: parties "may appear only in submitted documents" [002 L61], and some have been found after the original conflict check [002 L64].
- **Why it was held back.** Its misses look like a clean result (Dial-Tone). See [`rejected-features.md`](./rejected-features.md) R1.
- **Shape.** Add-only. The final list is Maria's list ∪ the accepted suggestions. Nothing is suppressed or ranked out of view, and the full manual read stays mandatory.
- **Synthetic hard gate** (proposal §4.8 and Mainframe's version; all thresholds are proposals for Drew):
  - A seeded adversarial set of about 25 fictional inquiries, written by someone other than the builder. Each is a form email with 0–3 attachments, including a scanned PDF and a Word document.
  - Seeded cases from the interviews: a party named only in an attachment; Robert/Bob variants; unrelated names in documents; organisations as well as people; an employer named in a termination letter; a document emailed later; one inquiry with zero parties.
  - Two-layer gold labels: (a) every person or organisation mention with its location, used for recall; (b) relevance, used only for precision and rejection load, never to filter.
  - **100% recall on the planted must-find mentions.** Every miss is investigated and blocks the build.
  - Every suggestion carries a source artifact, location and excerpt, and the excerpt must be found at that location.
  - An unauthorized inquiry never reaches the extraction step.
  - Precision and rejection counts are reported, not gated.
- **Real-data gates** (before anyone relies on it): historical replay against intakes where parties surfaced late; a shadow run alongside Maria's manual pass; recall at least as good as a human baseline. OBSERVATION: that baseline does not exist yet [002 L188].
- **Decisions for Drew:** whether V1.1 goes ahead at all, and who writes the seeded set (proposal §5 item 6).

## 2. Human-confirmed Clio write (V2 idea)

- **Why it exists.** FACT: Maria re-keys website data into Clio and would like to stop [002 L51, L143]. OBSERVATION (Mainframe): a read-only Packet cannot remove re-typing. At most it may reduce transcription errors (HYPOTHESIS).
- **Positions.**
  - Mainframe: prove the write contract first with a human-confirmed dry-run payload; add a real write only on evidence.
  - Recondo (challenge 1.2): "no Clio writes" is the active-matter V1's non-goal, not an interview CONSTRAINT. A human-confirmed write *into* Clio may honour "no second system" [001 L63–64] better than a sidecar that holds state.
  - Dial-Tone (#2 FAIL/FAIL): unsafe until a human confirms before the write and the prospective-matter object model (G3) is known.
- **Evidence that would justify it** (Mainframe Position B):
  - measured inquiry volume × minutes per entry showing material effort;
  - counts of transcription errors and duplicate contacts;
  - confirmation that the firm will not use Grow and that its plan gives API create access;
  - Drew ruling that the read-only rule does not bind intake;
  - Rachel accepting human-confirmed writes.

## 3. Clio Grow: buy vs build

- **Idea.** Grow's public intake form, leads inbox and pipeline may cover the front-door problems: re-keying, claiming, documents on the form (Recondo B.5 M1, M2, M4, M5; UNVERIFIED).
- **Reframed by Recondo:** a spend decision plus a policy ruling, not "configuration".
- **Failure modes (Dial-Tone #20):** one fixed assignee per public form brings back the unclaimed-inquiry problem when that person is away [002 L35]; the confirmation email removes the next-day callback that is today's only unclaimed-inquiry detector [002 L36]; no documented time-based alert.
- **Open:** does Rachel count Grow as "another independent system that employees must maintain separately" [001 L63]?
- **Effect on any build** (Mainframe): if the firm has or adopts Grow, the Packet's parsing and duplicate-check parts are largely covered, and the Packet shrinks to party suggestions only.

## 4. Clio Document Analyzer evaluation

- **Idea (Recondo):** before building any attorney summary, run a one-week structured trial of Clio's Document Analyzer on synthetic prospective matters against David's checklist [003 L93]. Treat attorney comprehension as V2, decided on that result.
- **Dial-Tone's caveat (#21):** if its party list ever feeds the conflict search, its misses are silent.
- **Open:** does it accept prospective (pending) matters? The help article says "Select an open matter".

## 5. Smaller deferred ideas

| Idea | Origin | Blocked by |
| --- | --- | --- |
| Read-only ownership display from Outlook categories, with age | Mainframe rule 6 (passed Dial-Tone's checks) | Real M365 access; firm alert thresholds; collisions may happen before categorizing (Recondo) |
| Aging alerts, paired with any claim mechanism | Recondo 5.7; Dial-Tone #7 | Firm thresholds (Dial-Tone Q10); state outside Clio |
| Read Clio task/status and show "no decision recorded", never "pending" | Mainframe (V2); Dial-Tone #22 | Real Clio; Mainframe expects it to return mostly "no decision recorded" |
| One-way "these accepted names have no recorded search" warning | Dial-Tone #13/#14 flip conditions | Only if Clio's own conflict-check record can be read (CQ3); never a "complete" state |
| Later-emailed documents shown as *candidate* links that Maria confirms | Mainframe revised sketch 2(d) | Association is a judgment [002 L111]; misfile risk |
| ConfirmationLog limited to the synthetic test harness | Proposal §4.3, §5 item 2 | Drew's ruling under the "no second system" constraint [001 L63] |
| Mailbox-vs-Clio reconciliation to expose silently dropped leads | Dial-Tone T1; Mainframe | Real data. Evidence-gathering, not a feature. |
