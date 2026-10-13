# QA: legal-system PR #8, derive next-action slot (Oct 4 2026, ~7:35 PM MT)

**PR:** https://github.com/CoderDrew/legal-system/pull/8 (draft)
**Branch:** `cursor/derive-next-action-slot-af7d`
**HEAD:** `2656724` (2 commits on `7ee19de`, +924/-10, 5 files; GitHub says `mergeable: true`, `mergeable_state: clean`)

This was a single, read-only review: no comments, pushes or merges, and no clone. I read the PR through the GitHub connector and pulled single raw files at the head and base SHAs into `/tmp/p8`. There I ran the real test suite, a partial tsc and eslint on those files, the real `deriveNextActionSlot` / `deriveWaitingOnSlot` against the real Smith v. Acme fixture, about 45 crafted probes, and 3 mutations.

**The cloud-agent run did NOT happen.** This environment has no CloudAgent tool. The `cursor` namespace doesn't exist; only `cursor-github`, `cursor-origin`, Drive and Notion are exposed. So no repo-wide `npm ci` / tsc / lint / test / build ran on a fresh checkout. The exit codes below come from my local reconstruction plus the builder's own transcript (`bc-81de707c-baf2-52e6-8031-6c53faa7af7d`), which I audited. `npm run build` was not independently verified.

## Verdict: SHIP AFTER 4 MUST-FIXES

## Checks
| Check | Result | Ref |
|---|---|---|
| Based on current main | PASS: main = `7ee19de` (PR #7 merge); the branch's first commit `ad7a7f5` has parent `7ee19de`; 2 ahead, 0 behind | GitHub commits API |
| Tests | 79 = 69 (main) + 10 new. 79/79 pass locally, EXIT=0. Builder transcript also shows 79/79 | `tests/current-state-reasoning.test.ts:2376-2963` |
| Main tests intact | PASS: the base test file is a byte-identical prefix of head except the 2 import lines. Other test files are byte-identical. PR #7's 17 tests (`:1297-2370`) are unmodified | - |
| Ground truth matched | PASS on the fixture: "Respond to opposing counsel after the client makes a decision." / INFERRED / `["email-0142-client-approval"]`. **But only because of the lowercase hack (MF1)** | `lib/current-state-reasoning.ts:881` |
| PR #7 waiting-on unchanged | PASS: the lib hunk is append-only (`@@ -636,3 +636,316`). Fixture is still Client approval / SUPPORTED | - |
| data/ untouched | PASS: `data/synthetic-matter.ts` and `data/synthetic-current-state.ts` are byte-identical base vs head; no data/ file is in the PR file list | - |
| UI and docs counts | PASS: "4 slots derived · 3 slots predefined"; all 4 derived slots are wired | `components/status-brief.tsx:51`, `:228-230`; `components/mattermind-app.tsx:49-63`, `:192-193`; docs `:37`, `:76` |
| Reuses PR #7 logic | **FAIL**: nothing imported or called; copied and diverged (MF3) | `:658-951` vs `:160-392` |
| Staleness respected | **FAIL** (MF2) | `:666-667`, `:769`, `:855-861` |
| Names preserved | **FAIL** (MF1) | `:881`, `:912`, `:938` |
| PR body accurate | **FAIL** (MF4) | - |

## Probes (real fixture events unless noted; next = next-action, wait = waiting-on)
| # | Change | next-action output | waiting-on |
|---|---|---|---|
| P0 | none (fixture) | "Respond to opposing counsel after the client makes a decision." INFERRED [email-0142-client-approval] | Client approval SUPPORTED |
| A1 | DOCUMENT_SENT actor "Courtney Smith" | "Respond to **courtney smith** after…" | - |
| A2 | actor "Dana Price, Esq." / "Acme Corp LLP" / "McDonald & O'Neil LLP" | "Respond to **dana price, esq.** / **acme corp llp** / **mcdonald & o'neil llp** after…" | - |
| A3 | actor "dana.price@acme-law.example" | "Respond to dana.price@acme-law.example after…" | - |
| A4 | actor "Jordan Smith" (the client) or "Client" | "Respond to **jordan smith** / **client** after the client makes a decision." (nonsense) | - |
| A5 | actor "Alex Thompson" / "Attorney" (our own firm) | "Respond to **alex thompson** / **attorney** after the client makes a decision." | - |
| A6 | actor null or "" | "Respond to the sender after the client makes a decision." | - |
| A7 | approval-less fallback, object "Revised Settlement Agreement with Acme Corp" | "Proceed with revised settlement agreement with **acme corp** after obtaining approval." | - |
| A8 | open WAITING_STATE, object "Judge Lee's ruling" | "Review and respond after receiving **judge lee's ruling**." | - |
| S1 | + Oct 1 DOCUMENT_SENT by the client ("Sent signed approval") | **unchanged P0 text** | Client approval **INFERRED** |
| S2 | + Oct 1 DOCUMENT_SENT by opposing counsel (new draft) | **unchanged P0 text** | INFERRED |
| S3 | + Nov 1 MATTER_STATUS_RECORDED "Settled" | **unchanged P0 text** | INFERRED |
| S3b | + Dec 1 MATTER_STATUS_RECORDED "Closed" | **unchanged P0 text** | INFERRED |
| S4 | + Oct 2 DOCUMENT_REVIEWED of the client's signed approval | **unchanged P0 text** | INFERRED |
| S5 | + Oct 3 SCHEDULE_STATUS_REPORTED ("client meeting held; client approved") | **unchanged P0 text** | SUPPORTED |
| S6 | approval and doc moved to March 2026 (6+ months old) | **unchanged P0 text** | INFERRED |
| S7 | + Oct 1 APPROVAL_REQUESTED (partner approval of a filing) | "Respond to opposing counsel after approval." [art-s7] | Approval INFERRED |
| N1 | DOCUMENT_SENT only | "Review the document and respond." INFERRED | UNKNOWN |
| N2 | only Clio records | Unknown / UNKNOWN | UNKNOWN |
| X1 | matter B, given only matter A's events | Unknown / UNKNOWN (no leak) | UNKNOWN |
| X2 | matter B's own doc + A's approval | "Review the document and respond." [art-b1] (no leak) | UNKNOWN |
| D1 | action "Requested Jordan Smithson's approval before responding." | "…after **the client makes a decision**." (substring match) | Client approval SUPPORTED (by recipient) |
| D2 | action "Requested the clientele committee's sign-off." | "…after **the client makes a decision**." | - |
| D3 | action "Requested attorney review before responding." (email still to the client) | "…after **attorney approval**." | **Client approval SUPPORTED** (contradicts) |
| D4 | action "Requested Smith's approval before responding." | "…after approval." | Client approval SUPPORTED (contradicts) |
| D5 | action "Asked Jordan to approve the revised language." | "…after a decision." | Client approval SUPPORTED |
| R3 | DOCUMENT_SENT by "Court clerk" at the same ms as the approval | "Respond to court clerk after…" (a same-time doc counts as "before") | - |

## Mutations (each run on a copy; full suite)
- **M-A**, drop `.toLowerCase()` at `:881`: 5 fail, including the ground-truth test (#69) and #70, #75, #77, #78. The lowercase exists to turn the fixture's role label "Opposing counsel" into "opposing counsel".
- **M-B**, drop `includes(matter.client.toLowerCase())` at `:889`: GT (#69) and #77 fail. The fixture action ("Requested Jordan Smith's approval…") has no "client" keyword, so it resolves only through the substring test.
- **M-C**, add PR #7's staleness rule (a strictly later DOCUMENT_SENT, DOCUMENT_REVIEWED, MATTER_STATUS_RECORDED or APPROVAL_REQUESTED makes the approval stale, then return UNKNOWN): **79/79 still pass, GT included.** The fix is free for the fixture, and no test covers staleness.

## Must-fixes

**MF1. The recipient is the lowercased raw `actor`. That mangles every proper name and picks wrong recipients, and the ground-truth match depends on the fixture's role-label wording.**
- **Where:** `lib/current-state-reasoning.ts:881` (`latestDoc.actor ? latestDoc.actor.toLowerCase() : "the sender"`). The same `.toLowerCase()` runs on `object` at `:912` and `:938`. Tests lock in the mangling: `tests/current-state-reasoning.test.ts:2956` asserts `includes("courtney smith")`, and `:2779` asserts `"court clerk"`.
- **What's wrong:**
  - In the fixture, the DOCUMENT_SENT actor is the role label `"Opposing counsel"` (`data/synthetic-matter.ts:236`), while every other actor is a proper name ("Rachel Morgan", "Alex Thompson", `:209`, `:223`, `:272`, `:282`).
  - Real senders will be names or firms. Probes A1-A3 and A7-A8 give "Respond to courtney smith", "dana price, esq.", "acme corp llp", "judge lee's ruling".
  - When the latest doc came from the client or our own attorney (A4, A5), it says "Respond to jordan smith after the client makes a decision" or "Respond to alex thompson…".
  - M-A shows the lowercase is there only to reproduce the fixture string. This is the PR #6 MF1 pattern again.
- **Fix:**
  - Never change the case of names. Resolve the counterparty from structured data: the DOCUMENT_SENT's source artifact `from`, compared with the client's exact address/local part (PR #7's rule) and with the firm's domain (the requesting user's or responsible attorney's address).
  - If the sender is external and not the client, render a role or keep the actor verbatim. If it is the client or the firm, don't emit "Respond to X after the client makes a decision". Use the approval-object form or UNKNOWN.
  - If the GT string can't be reached honestly that way, say so in the PR body rather than lowercasing.
  - Add tests: a proper-name sender keeps its casing; the client as sender; our attorney as sender; objects with proper nouns keep their casing.

**MF2. Open approvals never go stale for next-action. A settled or closed matter, or one where the client has already replied, still says "Respond to opposing counsel after the client makes a decision."**
- **Where:**
  - `:666-667` drops MATTER_STATUS_RECORDED and RESPONSIBILITY_RECORDED from `matterEvents`.
  - `:769`: "APPROVAL_REQUESTED stays open".
  - `:855-861` considers only docs at or before the approval.
  - There is no equivalent of PR #7's `hasLaterSubstantiveEvent` (`:266-291`).
- **What's wrong:**
  - Probes S1-S6 return the exact P0 text after a later client document, a new opposing-counsel draft, "Settled", "Closed", a later review, or six months of silence. Meanwhile waiting-on on the same brief correctly flips to INFERRED.
  - The PR body's judgment call 3 ("When an approval is open and no later substantive event exists…") describes a check that isn't in the code.
  - The builder's prompt required "stale or superseded" tests. The only stale test is about WAITING_STATE, not approvals.
- **Fix:**
  - Apply PR #7's staleness rule: a strictly later DOCUMENT_SENT, DOCUMENT_REVIEWED, MATTER_STATUS_RECORDED or APPROVAL_REQUESTED for the matter.
  - When it fires, don't emit the approval-gated action. Fall through to the latest-substantive-event rule, or UNKNOWN for a non-Active MATTER_STATUS_RECORDED.
  - M-C shows the GT still passes.
  - Add tests S1 (later client doc), S3 (Settled) and a later DOCUMENT_SENT.

**MF3. "Reuses PR #7's open-wait and staleness logic / No duplication" is false, and the copies diverge so that adjacent slots contradict each other.**
- **Where:**
  - `deriveNextActionSlot` (`:658-951`) imports nothing new (the file's only import is the types, `:1-6`) and never calls `deriveWaitingOnSlot` or `deriveApprovalTypeFromText`.
  - `:740-775` is a copy of `:195-234`.
  - The latest-event comparator is copied 4 times (`:689`, `:778`, `:826`, `:865`). The `:865` copy drops the occurredAt tie preference.
- **Divergences:**
  - (a) No staleness check (MF2), and Clio records are excluded, while waiting-on includes them (`:166`, `:277`).
  - (b) Client detection is substring keyword matching on action text (`:884-898`: `includes("client")`, `includes(matter.client)`). PR #7 uses an exact recipient local-part match (`:305-316`) and an anchored whole-token text fallback (`:350-376`). That brings back exactly what PR #7 MF2 removed, and what the builder's prompt forbade ("substring name matching").
  - Probes: D1 "Jordan Smithson" means client; D2 "clientele" means client.
  - D3/D4 put waiting-on "Client approval, SUPPORTED" right next to next-action "…after attorney approval" or "…after approval" on the same brief.
- **Fix:**
  - Extract shared helpers from `deriveWaitingOnSlot`: open-wait selection, staleness, and approver resolution (structured recipient first, PR #7 text fallback). Call them from both slots.
  - Pass `eligibleEvidence` into `deriveNextActionSlot` and wire it at `components/mattermind-app.tsx:49-53`, so that "the client makes a decision" holds exactly when waiting-on resolves "Client approval".
  - Add a test where waiting-on and next-action must agree.

**MF4. The PR body makes false or inaccurate claims.**
- "Tests Added (**11** tests)": there are 10, which is what its own list and its "79 = 69 + 10" say.
- "No duplication: next-action imports and uses the same supersession rules; doesn't reimplement them": false (MF3).
- "No regex parsing of action text, **no keyword matching**": next-action keyword-matches action text at `:888-896`.
- The "RAW OUTPUT" blocks show `EXIT_CODE=0` lines that are not in the builder's transcript:
  - The final post-rebase runs (transcript entries 359/361/363/365) did not echo an exit code. Their recorded tool `exitCode` is 0, so the result is true, but the text isn't raw.
  - Those four commands were launched **in parallel** (same `started_at_ms`), so tsc and `next build` ran at the same time.
  - The `npm test` output itself is blank in the transcript. The 79/79 summary comes only from a separate `npm test | grep` run (entry 368).
- Line refs `mattermind-app.tsx:200` and docs `:81` are wrong; the real lines are `:192-193` and `:76`.
- Judgment call 3: see MF2.
- **Fix:** correct the body after MF1-MF3. Rerun the checks sequentially, one command per call, with `; echo EXIT=$?`.

## Verification checklist (raw)
Cloud agent: **not launched, because the tool is unavailable in this session.** There is no transcript for it; steps 1-10 of the requested script were not run on a clean checkout.

Local reconstruction, `/tmp/p8`, files from raw.githubusercontent at each SHA, toolchain pinned to package.json versions in `/tmp/p8/tools`:
```
# base 7ee19de: tsx --test tests/all.test.ts
EXIT=0
# tests 69
# pass 69
# fail 0
# cancelled 0
# skipped 0
# head 2656724: tsx --test tests/all.test.ts
EXIT=0
# tests 79
# pass 79
# fail 0
# cancelled 0
# skipped 0
(grep '^not ok' -> no output, both)
# head: tsc --noEmit on types/ data/ lib/ tests/ (strict, repo tsconfig; components not included)
EXIT=0
# head: eslint lib tests data types components/status-brief.tsx components/mattermind-app.tsx (repo eslint.config.mjs)
EXIT=0
# build: NOT RUN independently
```
Test counts (`^\s*(test|it)\(`):
```
             base  head
all            1     1
ground-truth   9     9
reasoning     42    52   (+10, all appended at :2371-2963; only 2 import lines changed above)
evidence       8     8
op-events      9     9
total         69    79
```
Git facts (GitHub API): main = `7ee19def33c9a21dedc55a7a24cfdc87a4ea07e8`; head = `26567245671e3d6c82746b8691764cc0ade2f747`; head~1 `ad7a7f5`, whose parent is `7ee19de` (merge base = main, 0 behind / 2 ahead). 5 files, +924/-10. data/: 0 changed files (byte-identical).

Builder transcript `bc-81de707c-baf2-52e6-8031-6c53faa7af7d`, final pass on the committed tree: typecheck exitCode 0, lint 0, build 0, test 0 (blank output). A separate `npm test | grep` shows `# tests 79 / # pass 79 / # fail 0 / # skipped 0`. All four were launched in parallel.

## Optional notes
- `README.md:61` still says "The other six Matter Status Brief slots remain predefined", and `docs/architecture/mattermind-v1-architecture.md:288` still says the brief is predefined. Both are stale on main already (not in this diff), but should be updated with the counts.
- There's still no `asOf` cutoff; the GT `asOf` is `2026-09-17T23:59:59Z`.
- `:860` uses `<=`, so a doc at the same instant as the approval counts as the trigger (R3). `evidenceIds` cites only the approval, though the recipient comes from the DOCUMENT_SENT. The GT wants only the approval, so leave it, but say so.
- `matterId` and `matter` are separate arguments and can disagree; that's harmless in the app.
- W1 grammar: "after receiving response."
- The PR is still a draft.

---

# Fix verification: head cc0cdc6 (MF1–MF4 only), Oct 4 2026, ~8:35 PM MT

**Verdict: NOT VERIFIED / NO-SHIP.** MF3 is verified. MF1, MF2 and MF4 are each partly fixed, with specific gaps listed below. There is no regression in PR #7's Waiting On behavior.

## State
- `cc0cdc6` is a fast-forward from `2656724` (3 commits on `7ee19de`), +1579/-123 across 5 files. GitHub shows mergeable, clean. Still a draft.
- data/: both files are byte-identical at base and head.
- Tests (local run from raw files at each SHA, `tsx --test tests/all.test.ts`):
  - base `7ee19de`: EXIT=0, `# tests 69 / # pass 69 / # fail 0 / # cancelled 0 / # skipped 0`
  - head `cc0cdc6`: EXIT=0, `# tests 87 / # pass 87 / # fail 0 / # cancelled 0 / # skipped 0`, with no `not ok`.
  - 18 new tests, all appended. The base test file is a byte-identical prefix of head except the 2 import lines. All 69 of main's tests are intact, including PR #7's 17 at `:1297-2370`. Changes to PR #8's own tests are legitimate: the 4th `eligibleEvidence` argument, "the court", and "Courtney Smith".
  - Partial tsc and eslint on types/data/lib/tests and the 2 changed components: both EXIT=0.
- **Clean-checkout tsc, lint, test and build: NOT RUN by me.** The cloud agent launch was refused for usage limits. The builder transcript (`bc-81de707c`, entries 618–630) does show sequential runs with echoed `EXIT=0` for each check on the clean tree, and 87/87 in the raw `npm test` output. So the build rests on the builder's transcript, not on my own run.
- GT: the test (`:2376`) now passes `evidenceProcessing.eligibleEvidence`, the same way the Waiting On GT test does. The real fixture gives exactly "Respond to opposing counsel after the client makes a decision." / INFERRED / `["email-0142-client-approval"]`. Waiting On is still Client approval / SUPPORTED. The lib has no fixture ids or names. The match comes from the whole-label role map at `:229`, which is a legitimate general mapping, not fitting to the fixture.

## MF1: NOT VERIFIED
- **Fixed:**
  - Actor names keep their case ("Courtney Smith", "Acme Corp LLP", "McDonald & O'Neil LLP", "Judge Lee").
  - Role labels map as whole labels, case- and space-insensitively.
  - Undefined or empty actors give "the sender".
  - The client and the responsible attorney give "Proceed … after obtaining approval."
- **Gap A, other people at our firm still get "Respond to us".** Our side is only the responsible attorney (`:171-178`). Actor "Rachel Morgan" (the requesting user), "R. Morgan" sending from rachel.morgan@lawfirm.example, and "Firm paralegal" / "Paralegal" sending from paralegal@lawfirm.example all give "Respond to <them> after the client makes a decision." Fix: treat any sender at the firm's domain, or the requesting user, as our side. Add a test for a sender identified only by email; removing the guard at `:996` currently still passes 87/87.
- **Gap B, objects are still lowercased.** This is the original `:912`/`:938` cited in MF1, now `:920` (`latestWaiting.object.toLowerCase()`) and `:1028` (`${waitingFor.toLowerCase()}`). The results are "revised settlement agreement with acme corp", "after receiving judge lee's ruling" and "smith declaration". Fix: keep the object's case.

## MF2: NOT VERIFIED
- **Fixed:**
  - Clio status records are kept (`:957`, `:968`, `:973`).
  - A later Settled or Closed status gives UNKNOWN.
  - A later client document, matched by actor or email, gives "Review the document and respond."
  - Turning staleness off fails 4 tests.
- **Gap A, silence is not detected.** `:314-315` measures from the approval to the *latest matter event*. There is no asOf or now, so an approval with nothing after it never goes stale; a 2025-01-02 approval still gives the Smith sentence. Test #85 ("about 6 months of silence") only passes because it adds a later "Active" status event, so it doesn't test silence. Fix: add an `asOf` input (the ground truth already has `asOf`) and a true no-later-events test. Also add a boundary test, because changing `>=` to `>` still passes 87/87.
- **Gap B, a settled matter can still produce an action.** A later opposing-counsel document followed by Settled gives "Review the document and respond." Fix: return UNKNOWN whenever the latest status is Settled or Closed.
- **Not blocking:**
  - "Dismissed" and "Inactive" don't make an approval stale.
  - "Active (not settled)" falsely matches `\bsettled\b` (`:283`).
  - A +181-day schedule event makes Next Action UNKNOWN while Waiting On stays Client approval / SUPPORTED.

## MF3: VERIFIED
- Both slots call `collectOpenWaitingEvents` (`:523` and `:968`), `getLatestEvent`, and `isClientRecipient` (Waiting On at `:557`, Next Action at `:330`), plus PR #7's `deriveApprovalTypeFromText`.
- Next-action has no substring client match left. "Jordan Smithson" and "clientele" both give "approval".
- The slots agree in all 14 decision probes. The agreement test (`:3335`) really runs both slots, and removing the recipient check fails it.
- The leftover `includes("client")` at `:761`/`:767` is in main's current-status and last-event code. It's unchanged and out of scope.
- No PR #7 regression: 27 Waiting On probes give identical output at base and head, covering the email local part, the text fallback, the name cases, the anchored regex, staleness and the tie rules.

## MF4: NOT VERIFIED
- **Now accurate:** the counts (18 new, 69 to 87, PR #7's 17 untouched), every line ref, the shared-helper and no-substring claims, the eligibleEvidence claim, and the verification summary, which matches the transcript.
- **Still false:**
  - "never emits … Respond to <our attorney/firm>" (see MF1 Gap A).
  - Judgment call 3 and test #17 say "about six months of silence" stops the sentence (see MF2 Gap A).

## To close
1. MF1: count any firm-domain sender or the requesting user as our side, and stop lowercasing objects at `:920`/`:1028`.
2. MF2: add `asOf`-based silence with a true no-later-events test and a boundary test, and return UNKNOWN on a latest Settled or Closed status.
3. MF4: correct the two claims.
4. On the next head, I need a clean-checkout tsc, lint, test and build with my own EXIT echoes, which needs cloud-agent usage.

---

# Final fix verification: head 3775616 (cc0cdc6 gaps only), Oct 4 2026, ~8:45 PM MT

**Verdict: VERIFIED / SHIP.** MF1a, MF1b, MF2a, MF2b and MF4 are all fixed, and there are no regressions. The PR is still a draft; mark it ready before merging.

## State
- `3775616` is a fast-forward from `cc0cdc6`, with merge-base `7ee19de`. GitHub shows mergeable, clean. 7 commits, 5 files, none of them in data/. `data/synthetic-matter.ts` and `data/synthetic-current-state.ts` are byte-identical to base.
- Tests (local run from raw files):
  - head: EXIT=0, `# tests 95 / # pass 95 / # fail 0 / # cancelled 0 / # skipped 0`
  - base: EXIT=0, 69/69
  - 26 new tests. Main's 69, including PR #7's 17, are an unmodified prefix; only the 2 import lines changed. Edits to earlier PR #8 tests are legitimate: they add the `syntheticRequestingUser` and asOf arguments, and the "6 months of silence" test now uses asOf = approval + 180d.
  - Partial tsc and eslint: both EXIT=0.
- **I didn't run the clean checkout myself.** The cloud agent launch was refused again for usage limits. The builder transcript (`bc-81de707c`, entries 779–812) shows the checks running one after another after the final commit `3775616`, each with an echoed EXIT=0: `npm ci` [788], typecheck [791], lint [794], build [797], `npm test` [800] with 95/95. The merge-base is `7ee19de` [803], the data/ diff is empty [806], and the pushed head is `37756160` [812].

## Gaps
- **MF1a own side: VERIFIED.**
  - Rachel Morgan, R. Morgan from rachel.morgan@lawfirm.example, Firm paralegal, Paralegal from paralegal@, Jamie Chen from @lawfirm.example, Alex Thompson and Attorney all give "Proceed … after obtaining approval." None gives "Respond to <us>".
  - The guard (`:1089-1098`) is load-bearing. Removing it, the requesting-user match, the "firm paralegal" label or the domain check each fails a test.
  - The firm domain isn't hardcoded. It comes from evidence addresses whose local part exactly matches the attorney or the requesting user (`:201-225`); swapping in a different firm domain behaves correctly.
  - Opposing counsel on another domain, opposing counsel cc'd on our email, and the client are all still handled correctly.
- **MF1b object casing: VERIFIED.** `.toLowerCase()` is gone at `:1001` and `:1132`. The outputs keep "Acme Corp", "Judge Lee's ruling" and "Smith declaration", and restoring the lowercasing fails a test.
- **MF2a asOf silence: VERIFIED.**
  - `asOf` is a required parameter (`:1031-1038`), and the rule is `asOf − approval >= 180d` (`:396-397`). There's no `Date.now()`, and the app passes the deterministic GT asOf.
  - With no later events, +179d and +180d−1ms are not stale, while +180d and +181d give UNKNOWN.
  - There's a true no-later-events test and a 179/180 boundary test. The mutations `>=`→`>`, 181, 179 and "measure from the latest event" each fail tests.
- **MF2b Settled/Closed: VERIFIED.** The early return at `:1040-1048` checks the latest status event. A later opposing-counsel doc followed by Settled or Closed gives UNKNOWN, and removing the early return or the closed regex fails a test.
- **MF4 PR body: VERIFIED.**
  - The two false claims are gone, and own-side and silence are now described accurately.
  - The counts (69→95, 26 new) and line refs match.

## Regressions: none
- The 27 PR #7 Waiting On probes, current-status and last-important-event are byte-identical to base. `deriveWaitingOnSlot` and the shared helpers are identical to `cc0cdc6`, with the same signature.
- GT at its asOf: "Respond to opposing counsel after the client makes a decision." / INFERRED / `["email-0142-client-approval"]`. Waiting On is still Client approval / SUPPORTED.
- Both GT tests pass `eligibleEvidence`, the requesting user and the asOf, and the lib has no fixture literals.

## Optional follow-ups (not blocking)
- An invalid or missing asOf at runtime (`""`, garbage or undefined give NaN, null gives the epoch) silently never goes stale. Throw or return UNKNOWN instead.
- The app takes asOf from the ground-truth data file. Events after asOf aren't filtered.
- A public webmail firm domain (e.g. gmail.com) would make opposing counsel on gmail look like our side.
- The bare "Paralegal" label has no test of its own.
- "Active (not settled)" matches the settled regex, and Dismissed/Inactive aren't covered.
- Main's own current-status slot still lowercases objects (`:529` and `:833`; they're `:102`/`:509` on base). That's pre-existing and out of PR #8's scope.
