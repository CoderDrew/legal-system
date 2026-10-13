# QA: legal-system PR #9, derive owner slot (Oct 12 2026, ~1:45 PM MT)

**PR:** https://github.com/CoderDrew/legal-system/pull/9 (draft)
**Branch:** `cursor/derive-owner-slot-c831`
**HEAD:** `796ae5ae82c220e2cc3e9efb9c6055d87eb02616` (1 commit). **BASE:** `5967e138a5eab99efadc9e908ac049f143a7f0d2` (current main, which includes PR #8). +1050/-22 across 6 files. GitHub reports `mergeable: true`, `mergeable_state: clean`.

This was a single, read-only review: no clone, comments, pushes or cloud agent. I read the PR through cursor-github and pulled single raw files at base and head into `/tmp/p9/{base,head}`, using `node_modules` from `/tmp/p8f`. There I ran the real suite, a partial tsc and eslint, the real `deriveOwnerSlot` on the Smith v. Acme fixture plus about 50 owner probes, the PR #7/#8 probe script on base and head, and 11 mutations.

## Verdict: SHIP AFTER 3 MUST-FIXES

## MUST-FIX

**MF1. A reassignment recorded by role label returns the old attorney as SUPPORTED. The GT passes only because of the fixture's shape.**
`lib/current-state-reasoning.ts:1244-1246` maps the role label `object: "Responsible attorney"` to the static `matter.responsibleAttorney`, and never reads the event itself. The fixture event is `actor: null, object: "Responsible attorney", action: "Recorded Alex Thompson as the responsible attorney."`, so the GT matches by reading matter metadata, not the event.
Probe R1: fixture + a later event `actor null, object "Responsible attorney", action "Recorded Jamie Lee as the responsible attorney."` returns **"Alex Thompson" SUPPORTED [art-r1]**. That is a wrong owner, marked as supported, and cited to the evidence that contradicts it. It only becomes right when the new name is in `actor` (R1b).
*Fix:* a role label in `object` must not override a name stated in the same event. Resolve the person named in the event (action or excerpt) before falling back to `matter.responsibleAttorney`, or return UNKNOWN/INFERRED when the two disagree. Add a reassignment-by-role-label test.

**MF2. Any unrecognized actor or object string passes through as a SUPPORTED owner, including opposing counsel, judges, near-names and non-person objects.**
`:1252` ends with `return label;`. Only client, court and opposing-counsel *role labels* and the exact client name are excluded (`isExcludedOwnerLabel`). Probes, each on a single RESPONSIBILITY_RECORDED event:

| actor / object | output |
|---|---|
| actor "Dana Price" (opposing counsel by name) | "Dana Price" SUPPORTED |
| actor "Judge Lee" | "Judge Lee" SUPPORTED |
| actor "Jordan Smithson" (near the client, Jordan Smith) | "Jordan Smithson" SUPPORTED |
| actor "Al Thompson" / "Alex" / "Alex Thompsonn" | each passed through verbatim, SUPPORTED |
| object "Discovery responses" (actor null) | **"Discovery responses" SUPPORTED** |
| object "Matter" | **"Matter" SUPPORTED** |
| actor "Client", object "Discovery responses" | "Discovery responses" SUPPORTED |

The PR body's claims that "Client, court, and opposing-counsel labels are not owners" and "insufficient evidence is UNKNOWN" don't match this behavior. The object fallback is the worst case, because an object is not a person field.
*Fix:* only resolve to a known own-side identity (responsible attorney, requesting user, or a firm-domain artifact sender). Otherwise return INFERRED at most, or UNKNOWN. Never pass `object` through verbatim. Add tests for opposing counsel by name, a near-client name, and a non-person object.

**MF3. The text fallback picks the first known name mentioned, so handovers come out backwards.**
`:1284-1300` returns whichever known identity appears anywhere in the action. "Recorded Jamie Lee as the responsible attorney, replacing Alex Thompson." returns **"Alex Thompson" INFERRED**, and so does "Transferred from Alex Thompson to Jamie Lee." Both are wrong outputs.
*Fix:* return UNKNOWN when the text names any other person, or require the known name to be the recorded subject. Add a handover test. Near-names are fine here: "Al Thompson" and "Alex Thompsonson" correctly give UNKNOWN, since matching is word-bounded and exact.

## Checks
| Check | Result | Ref |
|---|---|---|
| Base / mergeable | base `5967e13` = main; head `796ae5a`; clean | PR API |
| Tests head | `# tests 114` `# pass 114` `# fail 0`, TEST EXIT=0 | `/tmp/p9/head-test.log` |
| Tests base | `# tests 95` `# pass 95` `# fail 0`, TEST EXIT=0 | `/tmp/p9/base-test.log` |
| New tests | 19 (68 → 87 in current-state-reasoning.test.ts): 1 current-status casing, 5 next-action follow-ups, 13 owner | - |
| Existing tests intact | PASS. The only removed line is the import line (`:13`, which now adds `deriveOwnerSlot`). Inserts are at `:754-817` and `:3948-4667`. The other 4 test files are byte-identical | diff |
| tsc (partial, probe tsconfig) | EXIT=0 base and head | - |
| eslint lib tests components | EXIT=0 base and head (only the pages-dir warning) | - |
| GT owner | "Alex Thompson" SUPPORTED ["clio-matter-0142"], matched. **But it comes from the role label mapped to matter metadata (MF1)** | `:1244` |
| Fixture literals in lib | none found (no "Alex Thompson", "0142" or "Smith" in the owner code) | - |
| asOf filter | PASS: after asOf is ignored (R2), exactly at asOf is included (R3), occurredAt=null uses sourceRecordedAt (R5), a garbage timestamp is excluded (R6), before the fixture event gives UNKNOWN | `:1332` |
| Ties | eventId tie-break via shared `compareEventsByTime` (R4 → later eventId wins). Deterministic | `:28-45` |
| Matter isolation | PASS (X1, X2) | `:1330` |
| Missing actor and object | UNKNOWN | - |
| Invalid asOf (owner) | "", "  ", "not-a-date", null all give UNKNOWN | `:1323-1326` |
| data/ untouched | PASS: byte-identical, no data/ file in the PR | - |
| UI and docs counts | PASS: "5 slots derived · 2 slots predefined" (`components/status-brief.tsx:51`, `:229-230`); the app wires owner (`components/mattermind-app.tsx:59-76`, `:207`); README `:59` and `docs/mvp/clio-catch-up-comparison.md:37`, `:76` all say five/two | - |
| PR body test count | 114/114 matches reality | - |
| PR body behavior claims | **FAIL** on the owner claims (MF2) and the "without overfitting" judgment call (MF1) | - |
| Builder transcript | `bc-2fdea0c0-b578-5adb-ae7c-b376f7b0c831` (from the PR footer). **Not auditable:** cursor.com is behind auth or Cloudflare, and I can't confirm sequential or echoed EXIT runs. The body only claims test and build, not typecheck or lint | - |

## Follow-ups from PR #8
| | Fix | Test | Mutation (revert fix → result) |
|---|---|---|---|
| (a) invalid/missing asOf | FIXED: `parseAsOfTime` `:387-397`; stale-on-invalid `:436-439`; next-action early return `:1084-1086` | `next-action: invalid or missing asOf is UNKNOWN…` (`:3950`, covers "", "   ", "not-a-date") | Reverting one guard leaves 0 failures (the guards are redundant). Reverting both gives 1 failure (#96). Meaningful |
| (b) webmail not firm domain | FIXED `:200-215`, `:238` | `next-action: webmail domain…` | 1 failure (#97) |
| (c) bare Paralegal | FIXED `:156` | `next-action: bare Paralegal…` | 1 failure (#98) |
| (d) "Active (not settled)" | FIXED `:403` | `next-action: Active (not settled)…` | 1 failure (#99) |
| (e) current-status casing | FIXED `:878-879`, `:937-949`. GT current-status is unchanged ("Settlement revisions are awaiting client approval." SUPPORTED) | `current-status: object text keeps original proper-noun casing` (`:754`) | 1 failure (#41) |

Owner-code mutations: dropping the asOf filter, dropping the matter filter, or taking the earliest instead of the latest event each fails 1 test. Making `return label` return null also fails 1 test. No test covers MF1, MF2 or MF3.

## Regressions (other 4 slots): PR #7/#8 probe script on base vs head
Waiting-on: **identical** on every probe. Next-action: 4 lines differ, and all of them are intended:
- D-gmail (opposing counsel and the attorney both on gmail): "Proceed with Draft after obtaining approval." → "Respond to Dana Price after the client makes a decision." This is (b).
- Approval from 2020 with asOf "" or "not-a-date": "Proceed with Draft…" INFERRED → UNKNOWN. This is (a).
- Fixture + OC doc + "Active (not settled)": UNKNOWN → "Respond to opposing counsel…" INFERRED. This is (d).

Current-status: only the intended casing change (e). Last-important-event: no lib change, and its tests are unchanged and pass.

## NICE-TO-HAVE
- The (a) guard is duplicated (`:1084` makes `:436-439` unreachable from next-action). Keep one, or add a test that reaches each.
- (d) only strips "not settled/closed". "not yet settled" or "unsettled" behave differently ("not yet settled" still matches as settled).
- (e) `\S+` captures trailing punctuation (for example "agreement,").
- Text-fallback INFERRED for "Recorded Rachel Morgan as paralegal." returns the requesting user as owner. Consider whether a paralegal counts as the "owner".
- Waiting-on still returns "Client approval" INFERRED when asOf is invalid (it takes no asOf), so it disagrees with next-action's UNKNOWN in that case.
- The PR body should also list typecheck and lint exit codes.

## Clean-checkout run
Cloud agent `bc-31abdbca`. I checked its transcript: one call per step, run sequentially.
- HEAD `796ae5ae82c220e2cc3e9efb9c6055d87eb02616`, merge-base = origin/main `5967e138`, 0 behind / 1 ahead
- `npm ci` EXIT=0 · `npx tsc --noEmit` EXIT=0 · `npm run lint` EXIT=0 · `npm test > /tmp/test.log` EXIT=0 · `npm run build` EXIT=0
- `# tests 114 / # pass 114 / # fail 0 / # cancelled 0 / # skipped 0`; no `not ok`
- diff: 6 files, +1050/-22 (README, mattermind-app.tsx, status-brief.tsx, clio-catch-up-comparison.md, lib/current-state-reasoning.ts, tests/current-state-reasoning.test.ts)
- data/ diff 0 lines; git status clean

---

## Verification: head 84ef51f (MF1-MF3 only) (Oct 12 2026, ~2:05 PM MT)

**HEAD:** `84ef51fcdc3946034508a35908bf02634d03f46a` (2 commits). **BASE:** `5967e13`. Mergeable, clean, draft, +1234/-22, 6 files. This was read-only: raw files in `/tmp/p9v/head`, compared with `/tmp/p9/head` (796ae5a). Only `lib/current-state-reasoning.ts` and `tests/current-state-reasoning.test.ts` changed. data/ is byte-identical.

### Verdict: NOT VERIFIED. MF1 and MF2 are fixed. MF3 is only partly fixed, and in the remaining cases it gives a wrong owner marked SUPPORTED.

| MF | Status | Evidence |
|---|---|---|
| MF1 role label as proxy | **FIXED** | `matchFirmSideIdentity` (`:1239-1253`) no longer maps role labels. "Recorded Jamie Lee as the responsible attorney." + object "Responsible attorney" → UNKNOWN (was Alex Thompson SUPPORTED). The same sentence with Rachel Morgan → Rachel Morgan SUPPORTED. A blank action plus the role object → UNKNOWN. Mutation (restore the role→`matter.responsibleAttorney` map) fails #103 and #114 |
| MF2 passthrough | **FIXED** | Dana Price, Judge Lee, Jordan Smithson, Al Thompson, Alex, Alex Thompsonn, "Discovery responses" and "Matter" all → UNKNOWN, whether in actor or object. Mutation (restore `return label`) fails 4 tests (#100, #103, #114, #115) |
| MF3 outgoing owner wins | **PARTIAL** | Fixed: "…, replacing Alex Thompson" and "from Alex Thompson to Rachel Morgan" → Rachel Morgan. With an unknown incoming name (Jamie Lee) → UNKNOWN. "took over from", "succeeds", "handed … to", "transferred to X by Y", and two firm names with no direction word → UNKNOWN. **Still wrong (see MF3-r below).** Mutation (disable stripping) fails #116. Mutation (`mentioned.length >= 1`, first name wins) fails **no test** |

**MF3-r. Remaining wrong outputs.** All of these come from the real `deriveOwnerSlot`. Object = "Responsible attorney" gives SUPPORTED; object = null gives the same value as INFERRED.

| action | output | correct |
|---|---|---|
| "Alex Thompson was replaced by Rachel Morgan." | **Alex Thompson SUPPORTED** | Rachel Morgan or UNKNOWN |
| "Reassigned from Alex Thompson." | **Alex Thompson SUPPORTED** | UNKNOWN |
| "Removed Alex Thompson as responsible attorney." | **Alex Thompson SUPPORTED** | UNKNOWN |
| "Recorded Alex Thompson as the former responsible attorney." | **Alex Thompson SUPPORTED** | UNKNOWN |

The root cause is `stripOutgoingOwnerPhrases` (`:1300-1305`). It strips `replaced by X`, which is the *incoming* owner, so passive voice comes out backwards. A bare `from X` with no `to` is not stripped. The new SUPPORTED-from-text path (`:1405-1413`, which upgrades a text match to SUPPORTED when the object is a role label) turns these mistakes into SUPPORTED claims.
*Required fix:* treat `replaced by X` as the incoming owner. Return UNKNOWN when the known name is the subject of from/removed/former/outgoing wording without a clear incoming owner. Add tests for passive voice and for a bare "from", and a test that fails under "first name wins".

**MF3-t. The matter-isolation test is now vacuous.** `owner: matter isolation…` (`:4549-4572`) uses "Priya Nair" on the other matter. Since MF2, Priya Nair resolves to UNKNOWN anyway, so removing the `matterId` filter fails no test. The behavior itself is still correct: Rachel Morgan on another matter is ignored and Alex Thompson remains, per the probe. *Fix:* use a known firm identity (for example the requesting user) on the other matter.

### Jamie Lee when not a known firm identity
The result is UNKNOWN in every form: actor, action text, replacing, or from/to. This is defensible for V1, because there is no firm directory, and UNKNOWN beats naming the outgoing attorney. The cost is that any reassignment to a colleague who isn't the matter's stored `responsibleAttorney` or the requesting user shows as UNKNOWN. Treat it as a documented limitation, not a must-fix.

### Smith v. Acme
"Alex Thompson" SUPPORTED ["clio-matter-0142"]. The path is text plus role label: actor null and object "Responsible attorney" miss the structured match, then the action "Recorded Alex Thompson…" matches a known identity uniquely, and the role object upgrades that to SUPPORTED (`:1405-1413`). It's correct, and it no longer depends on the role→matter mapping. Blanking the action → UNKNOWN; object null → INFERRED; actor "Alex Thompson" → SUPPORTED through the structured path. So it's no longer fitted to actor null, but SUPPORTED now depends on action text, which the PR body discloses (item 4). That's a judgment call, not a must-fix, though it's what makes MF3-r show up as SUPPORTED. Mutation (always INFERRED for text) fails only the GT test (#100).

### Regressions vs 796ae5a
- **Waiting-on, next-action, current-status:** the PR #7/#8 probe script output is byte-identical to 796ae5a. Current-status GT is unchanged.
- **Owner checks that passed last time:**
  - The asOf filter still works: after asOf is ignored, exactly at asOf counts, null `occurredAt` falls back to `sourceRecordedAt`, and a garbage timestamp is excluded.
  - Invalid asOf → UNKNOWN.
  - Ties (rerun with Rachel Morgan): eventId "zz" wins and "aa" loses, so it's deterministic.
  - Isolation holds.
  - Mutations: dropping the asOf filter fails #108 and taking the earliest event fails #107. Dropping the matter filter fails nothing (MF3-t).
- **Intended changes to earlier probes:** R1b/R3/R4 with actor "Jamie Lee" are now UNKNOWN instead of Jamie Lee SUPPORTED, which is consistent with MF2.

### Tests
- `# tests 117` `# pass 117` `# fail 0`, TEST EXIT=0 (`/tmp/p9v/test.log`). Partial tsc EXIT=0, eslint (lib, tests, components) EXIT=0. 114 → 117. The 3 new tests are #114 role-not-proxy, #115 unrecognized labels and #116 replacing/from-to.
- Main's tests and the other 4 test files are unmodified. Three edits are in PR #9's own owner tests:
  - `:4312-4313`: "attorney role label resolves to the responsible attorney" now asserts UNKNOWN. That's the correct behavior, but **the title is now false**. Rename it.
  - `:4471` and `:4506`: the asOf test's earlier actor changed from Alex Thompson to Rachel Morgan, so the test still discriminates. Acceptable.

### PR body
- Accurate: 117 tests, the description of the SUPPORTED path (items 3, 4 and 6), data/ unchanged, and the GT value/state/evidence.
- **Overclaims:** item 5 says "`replacing X` and `from X to Y` drop the outgoing owner". Passive "replaced by" does the opposite (MF3-r).
- Build EXIT 0 is unverified here. The builder transcript is still auth-walled.

## Clean-checkout run (84ef51f)

Cloud agent `bc-71c7ec24`. I checked its transcript: one call per step, run sequentially.
- HEAD `84ef51fcdc3946034508a35908bf02634d03f46a`, merge-base = origin/main `5967e138`, 0 behind / 2 ahead
- `npm ci` EXIT=0 · `npx tsc --noEmit` EXIT=0 · `npm run lint` EXIT=0 · `npm test > /tmp/test.log` EXIT=0 · `npm run build` EXIT=0
- `# tests 117 / # pass 117 / # fail 0 / # cancelled 0 / # skipped 0`; no `not ok`
- 6 files, +1234/-22; data/ diff 0 lines; git status clean

## Verification: head 32a3a42 (MF3 + required items) (Oct 12 2026, ~2:05 PM MT)

**HEAD:** `32a3a4231709eb5092c70b2ae23672fcaa2f3a08` (3 commits), base `5967e13`, mergeable/clean, draft, +1398/-22, 6 files. Read-only: raw files in `/tmp/p9w/head`. Compared with 84ef51f, only `lib/current-state-reasoning.ts` and `tests/current-state-reasoning.test.ts` changed. data/ is byte-identical.

### Verdict: NOT VERIFIED. All four required items pass. Fresh variants still return the outgoing attorney as owner, marked SUPPORTED, when the departure wording isn't one of the listed words (`no longer`, `stepped down`, `outgoing`, `prior`, and others).

| Item | Status | Evidence |
|---|---|---|
| (1) passive "X was replaced by Y" → Y | **PASS** | `isIncomingOwnerMention` (`:1309-1321`). "Alex Thompson was replaced by Rachel Morgan." → Rachel Morgan SUPPORTED; ALL CAPS and lowercase versions give the same. "…replaced by Jamie Lee." → UNKNOWN. Reversed roles ("Rachel Morgan was replaced by Alex Thompson.") → Alex Thompson, which is correct. Mutation (drop the `replaced by` incoming regex) fails #117 |
| (2) bare from / removed / former → UNKNOWN | **PASS** | `isOutgoingOwnerMention` (`:1329-1351`) + `hasIncomingRolePhrase` guard (`:1386`). All 3 exact strings → UNKNOWN (object RA and object null). Also tested with Rachel Morgan ("Reassigned from Rachel Morgan.", "Removed Rachel Morgan.", "Rachel Morgan, formerly…") → UNKNOWN. Mutations: drop `from X` → fails #118; drop both removed rules → fails #119. Dropping either removed rule alone, or the sentence-level former rule alone, fails nothing; they overlap, so this is acceptable |
| (3) test fails if first-name-wins is restored | **PASS** | Mutation `if (mentioned.length >= 1) return mentioned[0];` fails 6 tests: #116-#121, including the new #121 "first mentioned known name does not win a transfer" |
| (4) matter-isolation test no longer vacuous | **PASS** | `:4542-4576`: the other matter's actor is now "Alex Thompson", a known identity, and the test asserts UNKNOWN with no evidence. Mutation (drop `event.matterId === matterId`, `:1446`) fails #110 |

### MF3-r2. Fresh variants still wrong (real `deriveOwnerSlot`, object "Responsible attorney"; object null gives the same value as INFERRED)

| action | output | correct |
|---|---|---|
| "Alex Thompson is no longer the responsible attorney." | **Alex Thompson SUPPORTED** | UNKNOWN |
| "Alex Thompson stepped down as responsible attorney." | **Alex Thompson SUPPORTED** | UNKNOWN |
| "Alex Thompson withdrew as counsel." | **Alex Thompson SUPPORTED** | UNKNOWN |
| "Alex Thompson left the firm." | **Alex Thompson SUPPORTED** | UNKNOWN |
| "Alex Thompson, outgoing responsible attorney." | **Alex Thompson SUPPORTED** | UNKNOWN |
| "Prior responsible attorney: Alex Thompson." | **Alex Thompson SUPPORTED** | UNKNOWN |
| "Ex-attorney Alex Thompson." | **Alex Thompson SUPPORTED** | UNKNOWN |

Root cause: the outgoing-role check (`:1329-1351`) is a closed list (replacing / was replaced / from / removed / former / previously). Any other departure wording leaves the name "unmarked", and a single unmarked name is returned (`:1389-1391`). The role object then upgrades it to SUPPORTED (`:1465-1472`). This is the same MF3 failure class (outgoing owner kept as current owner) as before; only the vocabulary differs.
*Required fix:* add departure vocabulary to the outgoing check: `no longer`, `stepped down`, `withdrew/withdrawn`, `left`, `outgoing`, `prior`, `ex-`, `resigned`, `off the matter`. Better still, only allow a single unmarked name to be SUPPORTED when the sentence has a positive assignment verb (recorded/assigned/is responsible); otherwise it should be at most INFERRED or UNKNOWN. Add one test covering the new wording.

**Fresh variants that pass:**
- "Rachel Morgan replaced Alex Thompson[ as responsible attorney]." → UNKNOWN (two unmarked names; conservative, acceptable)
- "Alex Thompson was succeeded by Rachel Morgan." → Rachel Morgan
- "Rachel Morgan succeeded Alex Thompson." → UNKNOWN
- "Reassigned to Rachel Morgan from Alex Thompson." → Rachel Morgan
- "Rachel Morgan took over from Alex Thompson." → Rachel Morgan (was UNKNOWN at 84ef51f)
- "Replaced by Rachel Morgan (previously Alex Thompson)." → Rachel Morgan
- "Alex Thompson -- replaced by: Rachel Morgan" → UNKNOWN (the punctuation breaks the match; conservative)
- "Alex Thompson has been replaced." → UNKNOWN
- "Alex Thompson's replacement is Rachel Morgan." → UNKNOWN
- "Alex Thompson removed as responsible attorney." → UNKNOWN
- "Reassigned from Alex Thompson to Jamie Lee." → UNKNOWN
- "Alex Thompson is no longer on the matter; Rachel Morgan is now responsible." → UNKNOWN

The probe is `/tmp/p9w/head/probe/v32.ts` and its output is `/tmp/p9w/v32.out`.
Side effect (nice-to-have): "Recorded Alex Thompson as responsible attorney (removed from conflicts list)." → UNKNOWN, because the sentence-level `removed` rule (`:1346-1347`) is overbroad. It's conservative, so it's not a must-fix.

### Smith v. Acme
"Alex Thompson" SUPPORTED ["clio-matter-0142"]. It still goes through the text + role-label path: blanking the action → UNKNOWN, actor "Alex Thompson" → SUPPORTED, object null → INFERRED. No change from 84ef51f.

### Regressions vs 84ef51f
- The waiting-on / next-action / current-status probe output is byte-identical. The current-status GT is unchanged.
- In the owner probe, only the intended MF3 rows changed: passive/bare-from/removed/former → corrected; "took over from" → Rachel Morgan. MF1 and MF2 rows are identical (role label not a proxy; Dana Price / Judge Lee / Al Thompson / etc. → UNKNOWN).
- asOf, ties and isolation probes are unchanged.

### Tests
- `# tests 122 / # pass 122 / # fail 0`, TEST EXIT=0 (`/tmp/p9w/test.log`). This is 117 → 122; the new tests are #117-#121.
- Rename done: "attorney role label without a named person is UNKNOWN".

## Clean-checkout run (32a3a42)
**Not run.** The executor that did this verification had no cloud-agent launch tool, so the clean-checkout run is still pending (the parent should launch it and fill in this section). The local raw-file run above passed 122/122. Build EXIT 0 has not been verified independently; it appears only in the PR body.

## Verification: head d572235 (final) (Oct 12 2026, ~2:15 PM MT)

**HEAD:** `d572235385326d4d1958d59f4a16608ad67baa50`. Read-only: raw files in `/tmp/p9x/head`. Compared with 32a3a42, only `lib/current-state-reasoning.ts` and `tests/current-state-reasoning.test.ts` changed. data/, operational-events, evidence-processing and all.test are byte-identical.

**Change:** the incoming/outgoing/unmarked classifier is gone. Text can name an owner only when `isPositiveAssignmentMention` (`:1299-1323`) matches one of these, and exactly one known identity must match (`:1336-1344`):
- recorded/assigned/named/designated/appointed X as [the] responsible attorney/owner/counsel
- X took over / will handle
- replaced by X / succeeded by X
- reassigned/transferred/assigned/handed off to X
- from … to X

### Verdict: VERIFIED / SHIP (scoped items a-e). One residual limitation is noted below; it is not a must-fix within the agreed scope.

| Item | Status | Evidence |
|---|---|---|
| (a) departure phrasings → UNKNOWN | **PASS** | All 7 MF3-r2 strings, plus resigned, "off the matter", "handed off by X", "X (former).", "no longer assigned", "no longer assigned as responsible attorney", "ALEX THOMPSON -- WITHDRAWN!" and "; retired." All → UNKNOWN with object RA and with object null (`/tmp/p9x/v57.out`) |
| (b) lone name + role label → UNKNOWN; gate mutation | **PASS** | "Responsible attorney: Alex Thompson.", "Alex Thompson.", "Rachel Morgan." and "Alex Thompson, responsible attorney." → UNKNOWN. Mutation (remove the `.filter(isPositiveAssignmentMention)` at `:1340`) fails 8 tests (#116-#123, including the new #122 departure and #123 lone-name) |
| (c) earlier items, MF1, MF2 | **PASS** | Exact strings: passive → Rachel Morgan; bare from / removed / former → UNKNOWN; from→to → Rachel Morgan. Mutations: drop `replaced by` → #117; drop `from…to` → #121; drop matter filter (`:1394`) → #110; MF1 role→RA map → 9 tests (#103, #114, #117-#123); MF2 `return label` → 11 tests (#100, #103, #114, #115, #117-#123) |
| (d) Smith v. Acme | **PASS** | Alex Thompson SUPPORTED ["clio-matter-0142"]. Why: actor null, so structured match misses; the object "Responsible attorney" is not a person (MF1); the action "Recorded Alex Thompson as the responsible attorney." satisfies the positive-assignment gate, so the text owner is Alex Thompson; the role-label object upgrades it to SUPPORTED (`:1424-1429`). Blank the action → UNKNOWN; object null → INFERRED; actor Alex → SUPPORTED (structured). Mutation (text always INFERRED) fails only the GT test #100 |
| (e) no regressions | **PASS** | waiting-on / next-action / current-status probe output is byte-identical to 32a3a42. asOf / tie / isolation probes are unchanged. Owner probe: 2 rows changed, both now more conservative and correct: "Recorded Rachel Morgan as paralegal." Rachel INFERRED → UNKNOWN; V3 (actor Opposing counsel, action names Alex) Alex SUPPORTED → UNKNOWN. data/ is unchanged |

**Tests:** `# tests 124 / # pass 124 / # fail 0`, EXIT=0 (`/tmp/p9x/test.log`). The 2 new tests are #122 and #123. Existing tests were not edited (+38/-0).

### Residual limitation (nice-to-have, not in scope)
The gate checks for a positive-assignment *phrase*, not tense or a later reversal. The following still give Alex Thompson SUPPORTED (INFERRED with object null):
- "Previously assigned to Alex Thompson; now unassigned."
- "Originally assigned to Alex Thompson."
- "Was handed off to Alex Thompson, who then resigned."
- "Alex Thompson took over, then withdrew."

Negated or proposed forms are handled: "Request to reassign to Alex Thompson was denied." and "Do not transfer to Alex Thompson." → UNKNOWN.
*Suggestion:* veto the gate when the sentence contains a departure or reversal marker (previously/originally/then resigned/withdrew/unassigned/no longer).
Also a nice-to-have: mutating `assigned.length === 1` to `>= 1` (`:1341`) fails no test, because no test has two positively assigned names. The behavior is correct (2 assignees → UNKNOWN), but a test would pin it.

## Clean-checkout run (d572235)

Cloud agent `bc-d2aa4dc7` (run #3; run #1 errored, and run #2 wrongly ran on main and was discarded). I audited the transcript: one call per step, run sequentially, no edits, commits or pushes.
- HEAD `d572235385326d4d1958d59f4a16608ad67baa50`, merge-base = origin/main `5967e138`, 0 behind / 4 ahead
- `npm ci` EXIT=0 · `npx tsc --noEmit` EXIT=0 · `npm run lint` EXIT=0 · `npm test` EXIT=0 · `npm run build` EXIT=0 (build now verified)
- `# tests 124 / # pass 124 / # fail 0 / # cancelled 0 / # skipped 0`; `not ok` count 0 (the grep -c EXIT=1 is expected)
- 6 files, +1389/-22; data/ diff 0 lines; git status clean
