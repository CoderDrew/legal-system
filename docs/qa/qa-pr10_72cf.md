# QA: legal-system PR #10, important-date slot + reversed-owner fix (Oct 12 2026, ~2:45 PM MT)

**PR:** https://github.com/CoderDrew/legal-system/pull/10 (draft)
**Branch:** `cursor/derive-important-date-slot-2912`
**HEAD:** `99d95358114dbc506effa44229f6c62ca448ddd5` (1 commit). **BASE:** `ce55f623678e61519df0e60f2e6db5adb4ea238d` (main, which includes the merged PR #9). +963/-38 across 6 files: README.md, components/mattermind-app.tsx, components/status-brief.tsx, docs/mvp/clio-catch-up-comparison.md, lib/current-state-reasoning.ts (+402/-30), tests/current-state-reasoning.test.ts (+547/-1, where the -1 is only the import line). `mergeable_state: clean`.

This was a single, read-only review: no clone, comments, pushes or cloud agent. I pulled single raw files at head and base into `/tmp/pr10` and `/tmp/base10`. In `/tmp/pr10` I ran `npm ci`, the suite, tsc and lint, about 60 date probes and 24 owner probes against the real functions, 12 mutations, and a probe diff of the other 5 slots against base.

## Verdict: SHIP AFTER 3 MUST-FIXES

## MUST-FIX

**MF1. The reversed-owner fix is a keyword list, and fresh phrasings still return the departed attorney as SUPPORTED.**
`:1346-1366`: `assignmentHasHistoricalQualifier` only knows `originally|previously|formerly|initially|once|earlier`. `assignmentHasFollowingReversal` needs `then|later|subsequently|who( later)?` immediately before the departure verb, or the exact `now unassigned`.
All 4 strings from the brief give UNKNOWN. These fresh variants (RESPONSIBILITY_RECORDED, actor null, object "Responsible attorney") all give **SUPPORTED Alex Thompson**:
- "Assigned to Alex Thompson in 2024, but he has since withdrawn."
- "Handed off to Alex Thompson, who has since resigned."
- "Alex Thompson took over; he withdrew last week."
- "Alex Thompson took over until he resigned in August."
- "Alex Thompson took over and eventually withdrew."
- "Assigned to Alex Thompson, who is no longer with the firm."
- "At first assigned to Alex Thompson."
- "Assigned to Alex Thompson at intake; currently unassigned."

The rule also over-fires in the safe direction: "Assigned to Alex Thompson; Rachel Morgan later withdrew." gives UNKNOWN, because the reversal isn't tied to the same person, and so does "Once assigned to Alex Thompson, the matter moved quickly."
*Fix:* any departure or unassignment verb (withdr\*, resign\*, stepped down, left, no longer, unassigned, since) after the assignment span should drop that name unless a different incoming owner is positively assigned, instead of requiring a specific adverb. Add tests for at least 3 of these variants.

**MF2. A single date that is being vacated, cancelled or continued away from comes back as the current INFERRED date, and the destination heuristic picks the wrong date.**
`:1685-1721` `pickCurrentCalendarDate` returns `dates[0]` whenever there is exactly one date, whatever the wording. With the latest event's object set to "Hearing" and asOf `2026-09-17T23:59:59Z`:

| action | output |
|---|---|
| "Hearing continued from October 15, 2026." | **INFERRED October 15, 2026** (the date being continued away from) |
| "Hearing on 2026-10-15 continued; new date TBD." | **INFERRED October 15, 2026** (a continuance with no new date should be UNKNOWN) |
| "Hearing continued to a date to be set; previously 2026-10-15." | **INFERRED October 15, 2026** |
| "Hearing vacated (was 2026-10-15)." | **INFERRED October 15, 2026** |
| "Hearing 2026-10-15 cancelled." | **INFERRED October 15, 2026** |
| "Respond to 2026-10-01 order by 2026-10-20." | **INFERRED October 1, 2026** (bare `to` is read as a destination) |

The PR claims continuances are handled, but only the two-date "from X to Y" form is (correct: November 20). The superseding case works only when the later event carries no date ("Hearing continued; new date TBD." after a structured 2026-10-15 gives UNKNOWN).
*Fix:* a date preceded by `from`, `was`, `previously` or `originally`, or in the same clause as `continued`, `vacated`, `cancelled`, `adjourned` or `struck` with no destination date, must not be selected. Restrict destination `to` to change verbs (continued/moved/rescheduled/reset/extended … to). Add tests for "continued from X", "X cancelled/vacated" and "continued; new date TBD" carrying the old date.

**MF3. The invalid-calendar-date guard is untested.**
Mutation M10 (`isValidCalendarDate` at `:1532` with the round-trip check `getUTCDate() === day` replaced by `true`) gives **0 failures**. As written, the probes behave correctly: "2026-02-30" in either the object or the text gives UNKNOWN.
*Fix:* add one test with object `2026-02-30` (and/or text "Hearing 2026-02-30") expecting UNKNOWN.

## NICE-TO-HAVE

1. **UTC day boundary.** `:1565-1572` compares UTC calendar days. With asOf `2026-09-17T20:00:00-07:00` (still Sep 17 locally), a hearing on `2026-09-17` gives UNKNOWN because asOf's UTC day is Sep 18. A datetime object `2026-09-18T01:00:00Z` shows "September 18" even though that is Sep 17 in MT. This doesn't affect anything today, because the app passes the fixed `Z` asOf from the fixture (`components/mattermind-app.tsx:68-72`). It needs a firm-timezone decision before asOf becomes "now". Event-time filtering is correctly instant-based: an event at 23:59:59Z on the asOf day is included, and one at 00:00Z the next day is excluded.
2. **Format coverage gaps, all of which fail safe to UNKNOWN:** "Oct. 15, 2026", "15 October 2026", "10/15/26", and ISO with a time inside text ("2026-10-15T09:00") because `\b` fails before `T` at `:1627`.
3. **Ambiguous numeric dates.** "03/04/2027" is read as US M/D (March 4) with no ambiguity flag. That's acceptable for a US firm; document it.
4. **A passed latest date doesn't fall back.** If the latest event's date has passed and an earlier event had a future date, the result is UNKNOWN. That's conservative and reasonable; noting it as intended.

## Evidence

- **Suite:** `npm ci` EXIT=0 (lockfile unchanged from base). `npm test` EXIT=0 with `# tests 146 / # pass 146 / # fail 0` (base: 124/124). `npx tsc --noEmit` EXIT=0. `npm run lint` EXIT=0. The test diff is append-only plus the import line, so none of the 124 existing tests were edited.
- **tsx:** `package.json` devDependencies `"tsx": "4.23.15"`. `package-lock.json` has `tsx` in the root devDependencies (`:23`) and `node_modules/tsx` 4.23.15 with `"dev": true` (`:6926`). package.json and package-lock.json are byte-identical to base. The builder's EXIT 127 was a run before install, not a missing dependency.
- **data/ unchanged:** blob SHAs at head equal base (`synthetic-current-state.ts` 249350e, `synthetic-matter.ts` 3f79808).
- **Smith v. Acme GT:** important-date gives `UNKNOWN / "Unknown"` for the right reason. The schedule event object is "Settlement conference" and the action has no explicit date ("next month" is not parsed). The PR test at `:5109` shows a later structured `2026-10-15` flips it to SUPPORTED.
- **Brief's owner strings:** "Originally assigned to Alex Thompson.", "Previously assigned to Alex Thompson; now unassigned.", "Was handed off to Alex Thompson, who then resigned." and "Alex Thompson took over, then withdrew." all give UNKNOWN. "Originally assigned to Rachel Morgan; now assigned to Alex Thompson." gives SUPPORTED Alex Thompson. Two current names give UNKNOWN.
- **Date probes that pass:** object ISO, "October 15, 2026" and "10/15/2026" give SUPPORTED. A text date gives INFERRED. "4/3", "March 4" (no year), "next month", "in two weeks" and "tomorrow" give UNKNOWN. Two undirected dates give UNKNOWN. "from 2026-10-15 to 2026-11-20" gives Nov 20. "extended until 2026-11-01 from 2026-10-15" gives Nov 1. A passed date gives UNKNOWN. A date on the asOf day, with asOf at 23:59:59Z or at midnight 00:00:00Z, stays current. Ties on the same timestamp go to the higher eventId (e2), via the existing `compareEventsByTime`. An invalid asOf gives UNKNOWN.
- **Mutations** (each one reverted, then the full suite run):

| # | mutation | failing tests |
|---|---|---|
| M1 | `assigned.length === 1` → `>= 1` (`:1395`) | 1: "owner: exactly one assigned name is required" |
| M2 | historical qualifier off | 2 |
| M3 | following reversal off | 1 |
| M4 | filter back to `isPositiveAssignmentMention` | 4 |
| M5 | passed-date check → `true` | 1 |
| M6 | asOf event filter removed | 1 |
| M7 | first date always wins | 2 |
| M8 | structured object ignored | 6 |
| M9 | earliest event instead of latest | 3 |
| M10 | invalid-date round-trip check off | **0 (MF3)** |
| M11 | structured SUPPORTED → INFERRED | 5 |
| M12 | UTC-day compare → raw instant | 1 |

- **Other 5 slots:** one probe script (Smith v. Acme fixture at 6 asOf values × current-status, last-important-event, waiting-on, next-action and owner, plus 8 owner phrasings) produced **identical output on base ce55f62 and head**. At the GT asOf, current-status is "Settlement revisions are awaiting client approval." SUPPORTED, last-important-event is Sep 17 SUPPORTED, waiting-on is "Client approval" SUPPORTED, next-action is INFERRED, and owner is Alex Thompson SUPPORTED [clio-matter-0142].

## Clean-checkout run

Cloud agent `bc-a2182e75`. I audited the transcript: one call per step, run sequentially, no edits, commits or pushes.
- HEAD `99d95358114dbc506effa44229f6c62ca448ddd5`, merge-base = origin/main `ce55f623`, 0 behind / 1 ahead
- `tsx` 4.23.15 is in devDependencies (not dependencies), and its entry is in package-lock.json. node_modules was absent before `npm ci`.
- `npm ci` EXIT=0 · `npx tsc --noEmit` EXIT=0 · `npm run lint` EXIT=0 · `npm test` EXIT=0 · `npm run build` EXIT=0
- `# tests 146 / # pass 146 / # fail 0 / # cancelled 0 / # skipped 0`; `not ok` count 0 (the grep -c EXIT=1 is expected)
- 6 files, +963/-38; data/ diff 0 lines; git status clean

---

## Verification: head a5db89b (Oct 12 2026, ~3:00 PM MT)

**HEAD:** `a5db89be8e561d01863fefef7e48970b6acd6cdd`. 2 ahead / 0 behind main `ce55f623`. Same files as before. lib +414/-37, tests +707/-1.
**Method:** same as the review. Raw files in `/tmp/pr10b`, no clone, no cloud agent. Probe outputs are saved at `/tmp/pr10-99d9535-probes.out` and `/tmp/pr10-a5db89b-probes.out`.
**Suite:** `npm test` EXIT=0, 149/149. tsc EXIT=0. eslint on the PR files is clean; the only errors were in my own scratch probe file, since removed. package.json, package-lock.json and data/ are byte-identical to base. Existing tests are unedited apart from the import line.

### Verdict: NOT VERIFIED. 4 items left (one is a regression against main)

The builder replaced the keyword denylist with whole-statement anchors: `isCleanPositiveAssignmentStatement` `:1304-1317`, `isIncomingOwnerInRecognizedTransfer` `:1324-1338`, `isPositiveSchedulingTarget` `:1661-1676` and `dateHasDisqualifyingAttachment` `:1682-1700`. Every bad example from my review now gives UNKNOWN. But the owner anchors drop clean forms that resolve on main, and the date disqualifier only checks words right next to the date.

**V1. Owner regression against main ce55f623: clean transfers no longer resolve.** `:1312-1316` and `:1333-1337` only accept `assigned to X`, `from…to X`, `replaced/succeeded by X` and `…now assigned to X`. These resolve on main and on 99d9535, and now give **UNKNOWN**:
- "Transferred to Rachel Morgan." (this also shows up in my 5-slot base diff, the only changed row)
- "Reassigned to Rachel Morgan." (your example)
- "Rachel Morgan took over from Alex Thompson." (your "took over from" example)
- "Alex Thompson withdrew; Rachel Morgan took over."
- "Alex Thompson resigned and the file was reassigned to Rachel Morgan."
- "Alex Thompson took over after Rachel Morgan withdrew."

Still resolving: "Recorded Alex Thompson as the responsible attorney.", "Assigned to Alex Thompson.", "Reassigned from Alex Thompson to Rachel Morgan.", "Alex Thompson was replaced by Rachel Morgan.", "Rachel Morgan took over.", "Rachel Morgan will handle the matter.", "Named Rachel Morgan as counsel of record.", and "Originally assigned to Rachel Morgan; now assigned to Alex Thompson."
*Fix:* add anchored `^(?:reassigned|transferred|handed(?: off)?) to X$` and `^X took over from …$` forms. Accept a departure clause followed by an incoming clause (`<departure>; X took over`, `… reassigned to X`) when the final clause names the incoming person. Add tests, including "Transferred to Rachel Morgan." as a guard against the main regression.

**V2. A date with a positive scheduling form still wins when cancellation or vacatur wording isn't directly next to it.** `:1694-1699` only looks at `from|was|previously` directly before the date and `cancel|vacate` directly after it. These give a wrong **INFERRED October 15, 2026**:
- "Hearing previously set for 2026-10-15."
- "Hearing originally scheduled for 2026-10-15."
- "Hearing set for 2026-10-15 was vacated."
- "Hearing set for 2026-10-15 has been cancelled."
- "Hearing set for 2026-10-15 is off calendar."
- "Hearing set for 2026-10-15 continued without date."
- "Brief due 2026-10-15 was withdrawn."

The adjacent forms are correct: "set for 2026-10-15 vacated." and "…; new date TBD." give UNKNOWN.
*Fix:* check historical qualifiers (previously/originally/formerly/was) anywhere in the clause before the date. Check cancel/vacate/strike/withdraw/off calendar/continued (without a destination)/adjourn/postpone anywhere in the same clause after it, not only directly next to the date. Add 3+ tests from this list.

**V3. The 2026-02-30 test doesn't test the guard** (`:5610-5655`). With the round-trip check off (M10: `check.getUTCDate() === day` → `true` in `isValidCalendarDate` `:1501`), 2026-02-30 rolls over to March 2, 2026. That date is before `IMPORTANT_DATE_AS_OF` (Sep 17, 2026), so the passed-date rule returns UNKNOWN anyway and **0 tests fail**.
*Fix:* use a future invalid date, e.g. `2027-02-30` (which would roll over to March 2, 2027 and show up), for both the object and the text case.

**V4. Mutation survivors on the new date rules.**
- N3 (TBD rule `:1686` off), N4 (`from|was|previously` `:1694` off) and N5 (`vacated` before `:1697` off) each give **0 failures**. Every current test case for them is already rejected by `isPositiveSchedulingTarget`. Each needs a test where the date *does* follow a positive form: "set for X; new date TBD", "was set for X" or "from set for X", and "vacated hearing set for X". The V2 tests would cover N4 and N5.
- M1 (`assigned.length === 1` → `>= 1`, `:1359`) and M1b (`incoming.length === 1`, `:1366`) also give 0 failures. Whole-statement anchors make two matches practically impossible, so these are equivalent mutants. That's acceptable, but the "exactly one assigned name" test no longer guards `=== 1`. Either keep the check with a comment saying it's defensive, or drop the test's claim. Not blocking.

### What passes

- **Review examples:**
  - All 8 owner variants from MF1, plus 8 fresh ones, give UNKNOWN: "since left the firm", "who has since withdrawn", "but resigned in July", "until his withdrawal", "no longer at the firm", "At one point assigned", "presently unassigned", "has since departed".
  - All 6 date examples from MF2 give the right result. The 5 single-date examples give UNKNOWN, and "Respond to 2026-10-01 order by 2026-10-20." gives Oct 20, the `by` target.
  - Fresh date variants that are correct: "continued from Nov 3, 2026", "adjourned from 2026-11-03", "was 2026-10-15; continued", "originally set for X, now off calendar", "X struck", "postponed indefinitely", "previously scheduled for X was vacated", "adjourned sine die", "Respond to the 2026-10-01 order", and "Talk to Rachel about the 2026-10-20 hearing" all give UNKNOWN.
- **Clean dates:** structured ISO, long-form and numeric objects give SUPPORTED. "Hearing set for October 15, 2026", "rescheduled to 2026-11-20", "continued from X to Y" (both ISO and long-form), "moved to 11/20/2026", and object "2026-11-20" with action "Hearing continued" all resolve correctly.
- **Smith v. Acme:** owner Alex Thompson SUPPORTED [clio-matter-0142], important-date UNKNOWN. The 5-slot probe diff against ce55f623 is byte-identical except the V1 row.
- **Mutations caught:** M5, M6, M8, M9, M11, M12 (unchanged from the review), N1 anchor removed (2), N2 transfer exception removed (3), N6 cancel-after off (1), N7 bare `to` accepted (1), N8 any lone date accepted (1).

### Every changed row, 99d9535 → a5db89b

**Owner rows, SUPPORTED Alex → UNKNOWN (intended; this is MF1):** 6 of the 8 review variants and 8 fresh ones. The other 2 review variants ("At first assigned", "at intake; currently unassigned") are counted in the 8 fresh ones listed above.

**Owner rows, SUPPORTED → UNKNOWN (regression, V1):**
- "Reassigned to Rachel Morgan."
- "Transferred to Rachel Morgan."
- "Rachel Morgan took over from Alex Thompson."
- "Alex Thompson withdrew; Rachel Morgan took over."
- "…reassigned to Rachel Morgan."
- "Alex Thompson took over after Rachel Morgan left the firm/withdrew."

**Date rows, INFERRED → UNKNOWN (intended; MF2 and fresh variants):** the 5 MF2 examples, plus "continued from Nov 3", "adjourned from", "was …; continued", "struck", "postponed indefinitely", "adjourned sine die", "Respond to the 2026-10-01 order", and "Talk to Rachel about the 2026-10-20 hearing".

**Date rows, wrong date → right date (intended):** "Respond to 2026-10-01 order by 2026-10-20." and "Send to 2026-10-01 hearing notes by 2026-10-20." now give Oct 20 instead of Oct 1. "Reply to 2026-10-01 motion due 2026-10-20." also gives Oct 20.

**Date rows, INFERRED → UNKNOWN (safe-direction misses from the new allowlist, nice-to-have):**
- "Hearing on 2026-10-15."
- "Hearing on October 15th 2026"
- "Trial date: 2026-11-20."
- "Hearing on November 20, 2026 confirmed."
- "Hearing reset from 2026-10-15 to 2026-11-20." (`reset` isn't in the change verbs at `:1674`)
- "Deadline extended until 2026-11-01 from 2026-10-15." (`until`/`extended` dropped)

None of these produce a wrong value. But "Hearing on X" and "reset/extended … to/until Y" are common forms; consider adding `on`, `date:`, `reset` and `extended (until|to)`.

**Date row, UNKNOWN → INFERRED October 1, 2026:** "Hearing on 2026-10-15; reply due 2026-10-01." Only the `due` date is a positive target now, so it gives the reply deadline. That's defensible for a "Deadline / Important Date" slot, but it silently drops the hearing. Nice-to-have: give UNKNOWN when another explicit date is present in a different clause.

### Clean-checkout run (a5db89b)

Cloud agent `bc-0644dd82`. I audited the transcript: one call per step, run sequentially, no edits, commits or pushes.
- HEAD `a5db89be8e561d01863fefef7e48970b6acd6cdd`, merge-base = origin/main `ce55f623`, 0 behind / 2 ahead
- node_modules was absent before `npm ci`. `npm ci` EXIT=0 · `npx tsc --noEmit` EXIT=0 · `npm run lint` EXIT=0 · `npm test` EXIT=0 · `npm run build` EXIT=0
- `# tests 149 / # pass 149 / # fail 0 / # cancelled 0 / # skipped 0`; `not ok` count 0 (the grep -c EXIT=1 is expected)
- 6 files, +1135/-45; data/, package.json and package-lock.json: 0 diff lines; git status clean

---

## Verification: head 5df738c (Oct 12 2026, ~3:05 PM MT)

**HEAD:** `5df738c75f851229eab4fea853e98c125bbf81d2`. **BASE:** main `ce55f623`.
**Method:** raw files in `/tmp/pr10c`, no clone, no cloud agent.
**Suite:** `npm test` EXIT=0, 155/155. tsc EXIT=0. eslint on lib/ and tests/ EXIT=0. package.json, package-lock.json and data/ are byte-identical to base. Existing tests are unedited apart from the import line.
**Scope (Duke, round 3):** must-fixes are only wrong SUPPORTED or INFERRED values. A clean form that falls back to UNKNOWN is a nice-to-have.
**Probe outputs:** `/tmp/pr10-5df738c-probes.out` (the earlier set) and `/tmp/pr10-5df738c-fresh.out` (this round's set).

**Correction to the a5db89b section:** two of the "fresh date variants that are correct" were actually wrong at a5db89b, and both gave INFERRED October 15, 2026. They are "Hearing originally set for 2026-10-15, now off calendar." and "Hearing previously scheduled for October 15, 2026 was vacated." Both give UNKNOWN at 5df738c.

### Verdict: NOT VERIFIED. 2 wrong-answer bugs

**W1. Owner: the `(?:\s+and\b|$)` tail on the transfer pattern (`isCleanPositiveClause`, `:1331`) lets the first transferee win when a later "and …" clause changes the outcome.** All of these give SUPPORTED, with test-helper shape (actor null, object "Responsible attorney"):
- "Transferred to Rachel Morgan and later reassigned to Alex Thompson." gives **Rachel Morgan**; the current owner is Alex. *This is new in this PR: main gives UNKNOWN.*
- "Transferred to Rachel Morgan and back to Alex Thompson." gives **Rachel Morgan**.
- "Reassigned to Rachel Morgan and Alex Thompson." gives **Rachel Morgan**, even though two assignees should be UNKNOWN.
- "Handed off to Rachel Morgan and she resigned." gives **Rachel Morgan**.
- "Reassigned to Rachel Morgan and she later withdrew." gives **Rachel Morgan**.

Main gives the same wrong answer for the last four. This PR's transfer pattern keeps them, while `splitOwnerClauses` (`:1304-1313`) only splits on `and` before "(the file was) reassigned/transferred/handed to".
*Fix:* drop the `\s+and\b` alternative at `:1331`, so a transfer must end its clause, or split on any `and`. Then "… and later reassigned to X" either resolves to X or becomes UNKNOWN. Add tests for the first and fourth bullets.

**W2. Date: clause-level cancel words are still a fixed list (`clauseHasScheduleDisqualifier` `:1681-1691`), so common vacatur verbs give a wrong INFERRED October 15, 2026:**
- "Hearing set for 2026-10-15 has been postponed."
- "Hearing set for 2026-10-15 adjourned."
- "Hearing set for 2026-10-15 stricken."
- "Hearing set for 2026-10-15 continued generally."
- "Hearing scheduled for 2026-10-15 taken off the calendar." (`off calendar` matches, `off the calendar` doesn't)
- "Formerly set for 2026-10-15." (`formerly` is missing, although `clauseStartsHistorical` has it)
- "Hearing set for 2026-10-15 dropped."
- "Deposition scheduled for 2026-10-15 called off."
- "Hearing set for 2026-10-15 is no longer happening."
- "Response due by 2026-10-15 mooted by settlement."

*Fix:* add `postpon\w*`, `adjourn\w*`, `strick\w*|struck`, `formerly|initially`, `off\s+(?:the\s+)?calendar`, `continued\s+generally`, `dropped`, `called\s+off`, `no\s+longer` and `moot\w*`. Add one table test that covers them.

### Checks requested

1. **The 7 handoffs from item 1:** "Transferred to …", "Reassigned to …", "Rachel Morgan took over from Alex Thompson.", "Alex Thompson withdrew; Rachel Morgan took over." and "Alex Thompson resigned and the file was reassigned to Rachel Morgan." all give **SUPPORTED Rachel Morgan** again. The remaining two, "Alex Thompson took over after Rachel Morgan withdrew/left the firm.", give UNKNOWN; main gave Alex Thompson. That's a safe fallback, so it's a nice-to-have. The **5-slot probe diff against main ce55f623 is byte-identical** (the "Transferred" row is restored).
2. **Item 2:** all 7 clause-level examples give UNKNOWN ("previously set for", "originally scheduled for", "… was vacated", "has been cancelled", "is off calendar", "continued without date", "Brief due … was withdrawn"). Fresh variants that are correct: "was struck" and "canceled per court order" give UNKNOWN. A cancel word in an *unrelated earlier clause* still allows the date: "Motion withdrawn; hearing set for 2026-11-20." and "Old date cancelled; hearing set for 2026-11-20." both give Nov 20 (correct). "Hearing set for 2026-11-20; previously set for 2026-10-15." gives Nov 20 (correct). Gaps are in W2.
3. **2027-02-30:** the test exists at `:5610`. Disabling the whole round-trip check in `isValidCalendarDate` (`:1508-1513` → `return true`) fails 1 test ("invalid calendar date 2027-02-30 is UNKNOWN"). Disabling only the `getUTCDate` line still passes, because the month check catches the rollover; that's an equivalent mutant.
4. **Removing each rule in turn:**

| rule removed | failing tests |
|---|---|
| TBD `:1702` | 1 |
| from/was/previously `:1707` | 1 |
| vacated-before `:1710` | 1 |
| clause disqualifier `:1713` | 1 |
| cancel-after `:1716` alone | **0**: subsumed by the clause rule. Removing it together with the clause rule fails 2. Equivalent, not blocking |
| owner `assigned.length === 1` `:1363` → `>= 1` | 2 |
| date `unique.length === 1` `:1739` → `>= 1` | **0** |

   The second owner `=== 1` (`incoming`) no longer exists, because the builder merged the two paths. The date `unique` check has no test. Current behaviour is correct ("Hearing set for 2026-10-15 and response due by 2026-10-01." gives UNKNOWN), but a test is a nice-to-have. The historical-start check in `inferOwnerFromActionText` (`:1357`) also gives 0 failures when removed, because `isCleanPositiveClause` repeats it; that's an equivalent mutant.
5. **Earlier examples, GT and mutations:**
   - All 8 review owner variants and the 8 fresh ones still give UNKNOWN. All 6 review date examples are still correct. The only row changes from a5db89b are the 5 restored handoffs and the 2 corrected rows above.
   - Smith v. Acme: owner Alex Thompson SUPPORTED [clio-matter-0142], important-date UNKNOWN.
   - data/ is unchanged.
   - M5, M6, M8, M9, M11 and M12 are still caught, and so is N8 (any lone date accepted).

### Nice-to-haves (safe UNKNOWNs and test gaps only)
- "X took over after Y withdrew/left" gives UNKNOWN; main gave X.
- "Hearing on X", "Trial date: X", "confirmed", "reset from X to Y" and "extended until X" give UNKNOWN (carried over from a5db89b).
- "Reply due 2026-10-01; hearing on 2026-10-15." gives Oct 1, the reply deadline. That's defensible for a deadline slot.
- There's no test for the date `unique.length === 1` check.

### Clean-checkout run (5df738c)

Cloud agent `bc-ddd58526`. I audited the transcript: one call per step, run sequentially, no edits, commits or pushes.
- HEAD `5df738c75f851229eab4fea853e98c125bbf81d2`, merge-base = origin/main `ce55f623`, 0 behind / 3 ahead
- node_modules was absent before `npm ci`. `npm ci` EXIT=0 · `npx tsc --noEmit` EXIT=0 · `npm run lint` EXIT=0 · `npm test` EXIT=0 · `npm run build` EXIT=0
- `# tests 155 / # pass 155 / # fail 0`; `not ok` count 0
- 6 files, +1310/-46; data/, package.json and package-lock.json: 0 diff lines; git status clean

---

## Verification: head ae40c43 (Oct 12 2026, ~3:10 PM MT). Scope: W1 and W2 only

**HEAD:** `ae40c4393c290ee94127aae295cd4ec45cc7c404`. **BASE:** main `ce55f623`.
**Method:** raw files in `/tmp/pr10d`, no clone, no cloud agent.
**Suite:** `npm test` EXIT=0, 157/157. tsc EXIT=0. eslint on lib/ and tests/ EXIT=0. package.json, package-lock.json and data/ are byte-identical to base. Existing tests are unedited apart from the import line.
**Probe outputs:** `/tmp/pr10-ae40c43-w1w2.out`, `/tmp/pr10-ae40c43-probes.out`.
**Changes since 5df738c:**
- `isMultiPartOwnerClause` `:1313-1315`: any `and` in the final clause makes it UNKNOWN, applied at `:1359`.
- The transfer pattern is anchored with `$` at `:1335`.
- `clauseHasScheduleDisqualifier` `:1685-1691` gains `formerly|postponed|adjourned|stricken|continued|dropped|mooted`, `off (the) calendar`, `called off` and `no longer`, and now strips `(continued|moved|rescheduled) to` before testing.

### Verdict: W1 VERIFIED. W2 NOT VERIFIED: 1 wrong-answer bug left

**W1: fixed.**
- All 5 earlier variants give UNKNOWN.
- Fresh variants that give UNKNOWN:
  - "…, then to Alex Thompson."
  - "…and subsequently to Alex Thompson."
  - "…as well as Alex Thompson."
  - "…along with Alex Thompson."
  - "…plus Alex Thompson."
  - "… & Alex Thompson."
  - "…, who later withdrew."
  - "…; she later withdrew."
  - "…but she declined."
  - "…; Alex Thompson remains co-counsel."
  - "Rachel Morgan took over from Alex Thompson, then Alex Thompson took over again."
- "Transferred to Rachel Morgan, then reassigned to Alex Thompson." gives Alex Thompson SUPPORTED, which is correct.
- No new wrong answer found. "Rachel Morgan will handle discovery and depositions." and "…took over from Alex Thompson and Jamie Lee." now give UNKNOWN, a safe fallback (nice-to-have).
- Mutations:
  - Removing the multi-part check (`:1359`) fails 1 test.
  - Reverting the `$` anchor alone fails 0. It's covered by the multi-part check, so that's equivalent.
  - Reverting both fails 2.

**W2: the 10 listed words are fixed, but the clause disqualifier is still a list, and the new strip creates its own wrong answers.**
- All 10 listed cases give UNKNOWN. So do "postponed indefinitely", "canceled", "adjourned sine die" and "taken off calendar".
- These still give a wrong **INFERRED October 15, 2026**:
  - "Hearing set for 2026-10-15 struck." ("was struck" is caught only via `was`)
  - "…deferred."
  - "…stayed."
  - "…suspended."
  - "…rescinded."
  - "…on hold."
  - "…removed from calendar."
  - "…superseded."
  - "…will not go forward."
  - "…put off."
  - "Initially set for 2026-10-15."
- **The strip at `:1688` defeats the new `continued` word:**
  - "Hearing set for 2026-10-15 continued to a later date."
  - "…moved to a new date."
  - "…rescheduled to a date TBA."

  All three give **INFERRED October 15, 2026**. The strip removes "continued to" even when no date follows, so the old date survives.
- *Fix (structural, to stop the list growing every round):* accept a set-for/scheduled-for/due/by date only when nothing after it in the clause changes it. That means only the date, an optional time or location, and punctuation; anything else gives UNKNOWN, the same anchoring the owner rule now uses. At minimum: strip `(continued|moved|rescheduled) to` only when a calendar date immediately follows, and add `struck|deferred|stayed|suspended|rescinded|on hold|removed from|superseded|not go forward|put off|initially`.
- Mutations:
  - Removing the new words fails 1 test.
  - Removing only `continued` fails 1 test.
  - Removing the `continued/moved/rescheduled to` strip fails **0**: it has no test, and it's the source of the 3 wrong answers above.

### Regressions
- The 5 clean handoffs still give **SUPPORTED Rachel Morgan**. Smith v. Acme is unchanged: owner Alex Thompson SUPPORTED, important-date UNKNOWN. The 5-slot probe diff against main ce55f623 is **byte-identical**. data/ is unchanged.
- **Row changes against 5df738c:** the W1 and W2 fixes above, plus one safe fallback. "Hearing continued from 2026-10-15 to 2026-11-20." and "…from October 15, 2026 to November 20, 2026." went from INFERRED November 20 to **UNKNOWN**: the new `continued` word fires, because the strip needs "continued to" with nothing in between. That isn't a wrong value, but it's the standard continuance phrasing, so it's a strong nice-to-have. The structural fix above would resolve it.

### Clean-checkout run (ae40c43)

Cloud agent `bc-e5e730da`. I audited the transcript: one call per step, run sequentially, no edits, commits or pushes.
- HEAD `ae40c4393c290ee94127aae295cd4ec45cc7c404`, merge-base = origin/main `ce55f623`, 0 behind / 4 ahead
- node_modules was absent before `npm ci`. `npm ci` · tsc · lint · test · build all EXIT=0
- `# tests 157 / # pass 157 / # fail 0`; `not ok` count 0
- 6 files, +1380/-46; data/, package.json and package-lock.json: 0 diff lines; git status clean

---

## Verification: head 44c63df (Oct 12 2026, ~3:20 PM MT). Scope: W2 only

**HEAD:** `44c63df76e46e655a36be07101437c5cde115f64`. **BASE:** main `ce55f623`.
**Method:** raw files in `/tmp/pr10e`, no clone, no cloud agent.
**Suite:** `npm test` EXIT=0, 160/160. tsc EXIT=0. eslint on lib/ and tests/ EXIT=0. package.json, package-lock.json and data/ are byte-identical to base. Existing tests are unedited apart from the import line.
**New structure:**
- `inferCleanScheduleDate` `:1749-1769`: per-sentence anchored match.
- `matchAnchoredScheduleDate` `:1723-1735`: `^prefix FORM DATE after$`.
- `isPlainScheduleSubject` `:1680-1688`.
- `allowedScheduleAfterDatePattern` `:1669-1673`: time, then place.
- `statementHasUnresolvedContinuance` `:1707-1721`.
- The old guards (`dateHasDisqualifyingAttachment`, `isPositiveSchedulingTarget`) still run afterwards in `pickCurrentCalendarDate` `:1837-1854`.

**Probe output:** `/tmp/pr10-44c63df-w2.out`.

### Verdict: NOT VERIFIED. 3 wrong-answer bugs, all in the new structural rule

**S-A. A cancellation in a later sentence is ignored.** `:1755-1763` splits on `.` and matches each sentence on its own. Sentences with no date are skipped, not treated as disqualifying. All of these give **INFERRED October 15, 2026**:
- "Hearing set for 2026-10-15. Hearing cancelled."
- "… Later vacated by court."
- "… It was stayed."
- "… Then postponed."
- "… Struck."

*Fix:* every sentence must either be a clean schedule sentence or contain no change or negation wording. The simplest version: any sentence that isn't a clean schedule sentence makes the statement UNKNOWN. That turns "Hearing set for X. Bring exhibits." into UNKNOWN, a safe fallback.

**S-B. The place pattern swallows qualifiers.** At `:1671`, `(in|at) Word (+ up to 4 more words)` accepts any words, so these give **INFERRED October 15, 2026**:
- "Hearing set for 2026-10-15 in Courtroom 4 deferred."
- "… in Denver pending stay."
- "… in court until stayed."
- "… in absentia unless stayed."
- "Hearing is set for 2026-10-15 in theory."
- "Deadline by 2026-10-15 in limbo."

The listed cancel words ("in Courtroom 4 cancelled", "at the courthouse now vacated") are still caught, but only by the old `clauseHasScheduleDisqualifier`.
*Fix:* allow a place of at most 2-3 tokens, and only `Courtroom|Room|Dept|Department + number` or a capitalised proper noun. Reject anything containing a verb or one of `pending|until|unless|subject|theory|limbo|absentia|hold`. Better still, allow nothing after the place except punctuation, and cap the place at 3 tokens.

**S-C. The plain subject `of …` hides negation.** At `:1685`, `(?:\s+of\s+[A-Za-z][\w\s'-]*)` matches any run of words, so these give **INFERRED October 15, 2026**:
- "Deposition of Smith not set for 2026-10-15."
- "Hearing of Smith will not be set for 2026-10-15."
- "Deposition of Smith never scheduled for 2026-10-15."
- "Deposition of the witness who declined scheduled for 2026-10-15."

*Fix:* limit `of X` to 1-4 capitalised or plain name tokens, and reject `not|never|no|won't|will|be|who|which|that` inside the prefix.

### Requested checks: pass
- **The 11 words and the 3 'to a later date' cases:** all give UNKNOWN (struck, deferred, stayed, suspended, rescinded, on hold, removed from calendar, superseded, will not go forward, put off, Initially set for; continued/moved/rescheduled to a non-date). Fresh synonyms after the date also give UNKNOWN: tabled, pulled, scrapped, abated, terminated, denied, not happening, is off, "has been cancelled by the court", pending reschedule, "at 9am, cancelled", "at 9 am not happening", "at 9am, then deferred". The gaps are S-A, S-B and S-C above.
- **Clean positives:**
  - Continuances: "Hearing continued from 2026-10-15 to 2026-11-20." gives **November 20** (restored), as does the long-form version.
  - "continued to …", "rescheduled to …", "was moved to …" and "moved to 11/20/2026" all resolve.
  - "set for October 15, 2026" resolves, as does "set for 2026-10-15 at 9:00 am in Courtroom 4".
  - "Trial scheduled for …", "Brief due …", "Reported that the hearing is set for …" and "Deposition of Jordan Smith scheduled for …" resolve, as do "Respond to 2026-10-01 order by 2026-10-20", "Motion hearing … at 10am" and "Settlement conference … in Denver".
  - Structured object dates still give SUPPORTED.
- **Earlier examples from every round:** no earlier row now gives a different wrong value. Every change since ae40c43 is either the restored continuance (Nov 20) or a move to UNKNOWN. The moves to UNKNOWN are all safe fallbacks, so nice-to-haves:
  - "Motion withdrawn; hearing set for …"
  - "Old date cancelled; hearing set for …"
  - "Hearing set for 2026-11-20; previously set for 2026-10-15."
  - "Hearing set for …; no longer contested"
  - "Hearing on 2026-10-15; reply due 2026-10-01." and its mirror ordering
  - "Send to / Reply to 2026-10-01 … by/due 2026-10-20"
- **Mutations:**

| mutation | failing tests |
|---|---|
| S1 after-date `$` anchor removed | 1 |
| S2 plain-subject check off | 1 |
| S3 unresolved-continuance check off | 1 |
| S5 continuance form → set-for form | 2 |
| S6 place pattern off | 1 |
| S7 time pattern off | 1 |
| S8 legacy attachment check off | 1 |
| S4 `unique.length === 1` (`:1768`) → `>= 1` | **0** |
| S9 legacy positive-target check off | 0 (equivalent, now redundant) |
| S10 clause disqualifier off | 0 |
| S11 TBD off | 0 |

  - S4 is untested. Without it, "Trial scheduled for 2026-11-20. Hearing set for 2026-10-15." would pick a date; it's UNKNOWN today. Add a test.
  - S10 is not fully redundant: it's what still catches "in Courtroom 4 cancelled" past the place pattern (S-B). Fixing S-B makes it redundant.

### Regressions
- **Owner slot:** every owner row in the 99d9535, 5df738c and ae40c43 probe sets is identical, including all W1 variants (UNKNOWN) and the 5 clean handoffs (Rachel Morgan SUPPORTED).
- **Smith v. Acme:** owner Alex Thompson SUPPORTED, important-date UNKNOWN.
- **5-slot diff against main ce55f623:** byte-identical.
- **data/:** unchanged.

### Outside W2 (FYI, pre-existing since 99d9535)
The structured object wins regardless of the action text: object `2026-10-15` with action "Hearing cancelled" gives **SUPPORTED October 15, 2026**. That's by design ("structured first"). Duke should decide whether that's acceptable.

### Clean-checkout run (44c63df)

Cloud agent `bc-18ca5899`. I audited the transcript: one call per step, run sequentially, no edits.
- HEAD `44c63df76e46e655a36be07101437c5cde115f64`, merge-base = origin/main `ce55f623`, 0 behind / 5 ahead
- node_modules was absent before `npm ci`. `npm ci` · tsc · lint · test · build all EXIT=0
- `# tests 160 / # pass 160 / # fail 0`; `not ok` count 0
- 6 files, +1576/-46; data/, package.json and package-lock.json: 0 diff lines; git status clean

---

## Verification: head 3c165c5 (final) (Oct 12 2026, ~3:30 PM MT). Scope: W2 only

**HEAD:** `3c165c506691130988298865aee4635d1f712bdd`. **BASE:** main `ce55f623`.
**Method:** raw files in `/tmp/pr10f`, no clone, no cloud agent.
**Suite:** `npm test` EXIT=0, 162/162. tsc EXIT=0. eslint on lib/ and tests/ EXIT=0. package.json, package-lock.json and data/ are byte-identical to base. Existing tests are unedited apart from the import line.
**Template:**
- `inferStrictScheduleDate` `:1780-1790`: forbidden words, one sentence, whole-text template, unique target.
- `matchWholeTextScheduleTemplate` `:1744-1763`.
- Subject allowlist `:1663-1681`, place `:1683-1687`, time `:1689-1691`.

**Probe output:** `/tmp/pr10-3c165c5-w2.out`.

### Verdict: NOT VERIFIED. 1 wrong-answer bug (small)

**F1. The proper-noun place branch accepts any capitalised words, so a capitalised or ALL-CAPS status tag after the place passes.** `schedulePlacePattern` `:1685`, `proper = [A-Z][A-Za-z'-]*(?:\s+[A-Z][A-Za-z'-]*){0,2}`. These give **INFERRED October 15, 2026**:
- "Hearing set for 2026-10-15 in Denver CANCELLED"
- "Hearing set for 2026-10-15 in Denver Postponed."
- "Hearing set for 2026-10-15 at Courthouse Vacated"
- "Hearing set for 2026-10-15 in Denver Off Calendar"

The lowercase forms ("in Room 4 cancelled", "in Courtroom 4 deferred", "in Denver pending stay") correctly give UNKNOWN. ALL-CAPS status tags are common in docket and calendar exports.
*Fix:* exclude status words from place tokens (a case-insensitive negative lookahead for `cancel|vacat|postpon|adjourn|stay|struck|strick|off|continu|drop|withdr|moot|hold|tbd|defer|suspend|rescind`), or cap the proper-noun place at 2 tokens with no ALL-CAPS token. Add one test with "in Denver CANCELLED".

### Requested checks
- **S-A, a later sentence: fixed.** All 5 earlier cases give UNKNOWN. So do the fresh "…! Cancelled", "…; cancelled", "… - cancelled", a newline then "Cancelled", and "(cancelled)".
- **S-B, place plus qualifier: fixed for lowercase qualifiers.** All 6 earlier cases give UNKNOWN, as do "in Room 4 cancelled" and "at 9:00 am Cancelled". The gap is F1. "in Courtroom TBD" gives Oct 15, which is correct: the room is unknown, not the date.
- **S-C, negation hidden in the subject: fixed.** All 4 earlier cases give UNKNOWN. So do "Deposition of Smith Cancelled scheduled for…", "Hearing of Smith Vacated set for…", "won't be", "isn't", "NOT", "Not", "Previously set for" and "Cancelled Hearing set for".
- **Two dates: give UNKNOWN.** "Trial scheduled for X. Hearing set for Y.", "set for X by Y", "set for X and Y", "continued from X to Y by Z", "in Room <date>". **But the one-date check has no test.** Removing `hasUniqueScheduleResult` (`:1769`) fails 0 tests, and so does changing `unique.length === 1` to `>= 1` (`:1722`). It's an equivalent mutant: the whole-text template already accepts only one target date, since the "from X" date in a continuance isn't a target. So no wrong answer can reach that check today. The requested "test that catches loosening the one-date check" can't exist without making the check reachable. Either drop the check or keep it with a comment saying it's defensive. Not blocking.
- **Clean positives:**
  - Resolving: "continued from 2026-10-15 to 2026-11-20" and the long-form version (Nov 20), "rescheduled to", "continued to", "moved to 11/20/2026", "set for 2026-10-15 at 9:00 am in Courtroom 4", "Trial scheduled for", "Response due by", "Deadline by", "set for October 15, 2026", and structured objects (SUPPORTED).
  - **Falling back to UNKNOWN** (safe, nice-to-have):
    - "Brief due 2026-10-20": `Brief` isn't in the allowlist at `:1664-1675`.
    - "Deposition of Jordan Smith scheduled for 2026-10-20": the `of Name` branch at `:1678-1679` never matches. "Deposition of Smith…" also gives UNKNOWN, while "Deposition scheduled for…" resolves.
    - "Settlement conference … in Denver"
    - "Hearing was moved/was continued to …"
    - "Reported that the hearing is set for …"
    - "Respond to 2026-10-01 order by …"
    - "Respond to stay order by …"

    Duke listed "Brief due" and "Deposition of Jordan Smith" as clean positives that must resolve. They don't, but under round-3 scope they're nice-to-haves.
- **Mutations:**

| mutation | failing tests |
|---|---|
| T4 multi-sentence check off | 2 |
| T5 set-template `$` off | 5 |
| T6 set-template `^` off | 4 |
| T8 place → any words | 1 |
| T9 proper noun → any case, 5 tokens | 1 |
| T10 subject allowlist → any words | 3 |
| T11 continuance branch off | 2 |
| T12 time pattern off | 1 |
| T1/T2 one-date check off or loosened | **0** (equivalent, see above) |
| T3 forbidden-words check off | **0** (subsumed by the subject allowlist and anchors in every current test) |
| T7 continuance-template `$` off | **0** |

  - T7 is a real test gap: without that anchor, "Hearing continued to 2026-11-20, later vacated" would be accepted. It gives UNKNOWN today. Add a test.

### Regressions
- **Owner slot:** every owner row in all earlier probe sets is identical, including W1 (UNKNOWN) and the 5 clean handoffs (Rachel Morgan SUPPORTED).
- **Smith v. Acme:** owner Alex Thompson SUPPORTED, important-date UNKNOWN.
- **5-slot diff against main ce55f623:** byte-identical.
- **data/:** unchanged.
- **Date rows against 44c63df:** every change is a move to UNKNOWN (the S-A, S-B and S-C fixes plus the safe fallbacks above). No row gained a new or different INFERRED value.

### Clean-checkout run (3c165c5)

Cloud agent `bc-f4413712`. I audited the transcript: one call per step, run sequentially, no edits.
- HEAD `3c165c506691130988298865aee4635d1f712bdd`, merge-base = origin/main `ce55f623`, 0 behind / 6 ahead
- node_modules was absent before `npm ci`. `npm ci` · tsc · lint · test · build all EXIT=0
- `# tests 162 / # pass 162 / # fail 0 / # cancelled 0 / # skipped 0`; `not ok` count 0
- 6 files, +1586/-46; data/, package.json and package-lock.json: 0 diff lines; git status clean

---

## Verification: head c789e03 (confirm) (Oct 12 2026, ~3:35 PM MT). Scope: F1 only

**HEAD:** `c789e035665508e7074e7017292b5b23a684e69b`. **BASE:** main `ce55f623`.
**Method:** raw files in `/tmp/pr10g`, no clone, no cloud agent.
**Suite:** `npm test` EXIT=0, 163/163. tsc EXIT=0. eslint on lib/ and tests/ EXIT=0. package.json, package-lock.json and data/ are byte-identical to base. Existing tests are unedited apart from the import line.
**Change since 3c165c5:**
- `schedulePlaceWordPattern` `:1683-1708`: title-case word, with a negative lookahead for 18 status stems.
- `proper` is now 1-2 such words (`:1712-1713`).
- Two "defensive" comments on the one-date check.

The room branch at `:1711` is unchanged.
**Probe output:** `/tmp/pr10-c789e03-f1.out`.

### Verdict: NOT SHIP YET. 1 wrong-answer bug left (same class as F1, two gaps)

**F1-r. A status word can still sit in the place slot.** These give **INFERRED October 15, 2026**:
- **Room branch, `:1711`:** `(Courtroom|Room|Dept|Department)\.?\s+[A-Za-z0-9]+` takes any word as the room id. So "Hearing set for 2026-10-15 in Room Cancelled", "… in Courtroom Vacated" and "… in Dept CANCELLED" all pass. ("in Room 4 Cancelled" and "in Courtroom 4 VACATED" correctly give UNKNOWN.)
- **Second title-case word, `:1713`:** the stem list is still a denylist. So "in Denver Superseded", "in Denver Rescinded", "in Denver Pending" and "in Denver Abated" all pass.

*Fix:* require a digit in the room id (`[0-9][A-Za-z0-9]*` or `[A-Za-z]?[0-9]+[A-Za-z]?`), and make the proper-noun place exactly **one** title-case word. A two-word place like "New York" then gives UNKNOWN, which is a safe fallback. Alternatively, keep 2 words but add `supersed|rescind|pend|abat` to the stems. The 1-word cap is the structural fix. Add one test for the room case ("in Room Cancelled").

### Requested checks
- **The 4 F1 cases:** all give UNKNOWN.
- **Fresh variants that give UNKNOWN:** mixed case "CaNcElLeD", a status word as the first place word ("in Cancelled", "in Vacated Denver"), "in New York Stayed", "Adjourned", "Deferred.", "Moot", "at Courthouse Stricken" and "at Denver Off". The gaps are F1-r above.
- **Reverting each rule:**
  - Reverting the proper-place pattern fails 1 test ("place status words and ALL-CAPS are UNKNOWN").
  - Removing the stem lookahead fails 1.
  - Removing the end anchor on the continuance template (`:1787`) fails 1: the end-anchor test now exists and works.
  - Allowing ALL-CAPS words (`[A-Z][a-z]+` → `[A-Z][A-Za-z]+`) fails **0**, because the test's "CANCELLED" is also caught by the stems. So a non-stem ALL-CAPS word (e.g. "in Denver SUPERSEDED") isn't guarded by the test. The 1-word cap would make this moot.
- **Clean places:** "in Courtroom 4", "in Denver", "at 9:00 am in Courtroom 4", "in New York", "in Room 12B" and "at Courthouse" all resolve to October 15, 2026. "in Dept. 5" and "in Salt Lake City" give UNKNOWN, a safe fallback (nice-to-have).

### Regressions
- **The 3c165c5 probe set, re-run:** the only changed rows are the 4 F1 cases, each moving from INFERRED to UNKNOWN (intended). The owner, date and W1/W2 rows in all earlier probe sets are otherwise identical.
- **Owner slot:** W1 variants UNKNOWN, the 5 clean handoffs Rachel Morgan SUPPORTED.
- **Smith v. Acme:** owner Alex Thompson SUPPORTED, important-date UNKNOWN.
- **5-slot diff against main ce55f623:** byte-identical.
- **data/:** unchanged.

### Clean-checkout run (c789e03)

Cloud agent `bc-7a41abba`. I audited the transcript: one call per step, run sequentially, no edits.
- HEAD `c789e035665508e7074e7017292b5b23a684e69b`, merge-base = origin/main `ce55f623`, 0 behind / 7 ahead
- node_modules was absent before `npm ci`. `npm ci` · tsc · lint · test · build all EXIT=0
- `# tests 163 / # pass 163 / # fail 0`; `not ok` count 0
- 6 files, +1652/-46; data/, package.json and package-lock.json: 0 diff lines; git status clean

---

## Verification: head 3ffc736 (confirm) (Oct 12 2026, ~3:40 PM MT). Scope: F1-r only

**HEAD:** `3ffc736c844f8ea29bb8a1b6d8b50de80d347612`. **BASE:** main `ce55f623`.
**Method:** raw files in `/tmp/pr10h`, no clone, no cloud agent.
**Suite:** `npm test` EXIT=0, 165/165. tsc EXIT=0. eslint on lib/ and tests/ EXIT=0. package.json, package-lock.json and data/ are byte-identical to base. Existing tests are unedited apart from the import line.
**Change since c789e03:**
- `scheduleRoomNumberPattern` `:1710-1712`: `(?:[0-9][0-9A-Za-z-]*|[A-Za-z]?[0-9]+[A-Za-z]?)`.
- The room uses it at `:1715`.
- The proper-noun place is a single word at `:1717`.

**Probe output:** `/tmp/pr10-3ffc736-f1.out`.

### Verdict: NOT SHIP YET. 1 tiny residual wrong answer, a one-line fix

**F1-r2. The first room-number alternative, `[0-9][0-9A-Za-z-]*` (`:1711`), accepts a digit followed by any letters or hyphens, so a status word glued to the room number passes.** These give **INFERRED October 15, 2026**:
- "Hearing set for 2026-10-15 in Room 4CANCELLED"
- "Hearing set for 2026-10-15 in Room 4-Cancelled"

The same alternative also lets a date act as the room number. "Hearing set for 2026-10-15 in Room 2026-11-20" moved from UNKNOWN (at c789e03) to INFERRED October 15. That's arguably not wrong, since the set-for date is Oct 15, but the text is ambiguous.
*Fix:* drop the first alternative and keep only `[A-Za-z]?[0-9]+[A-Za-z]?`. I tested this as mutation R3. All 165 tests still pass. "4CANCELLED" and "4-Cancelled" give UNKNOWN. "Room 4B", "Room 12B", "Courtroom 4" and "at 9:00 am in Courtroom 4" still resolve. Add "in Room 4-Cancelled" to the place test.

("in Denverstayed", a single run-together word, also gives Oct 15. That's a typo and just a word as far as any parser can tell, so it's not flagged.)

### Requested checks
- **The 7 F1-r cases:** all give UNKNOWN ("in Room Cancelled", "in Courtroom Vacated", "in Dept CANCELLED", "in Denver Superseded/Rescinded/Pending/Abated").
- **Fresh cases that give UNKNOWN:** "in Room 4B Stayed", "in Courtroom 4 Superseded", "in Denver.Cancelled", "in Room 4 Cancelled", "in Room 4, cancelled", "in Denver SUPERSEDED", "in Room Four", and "in Courtroom 12 TBD" (the nice-to-have).
- **Reverting the new rules:**
  - Changing the room number back to any word (R1) fails 1 test ("room token without a digit or extra place word is UNKNOWN").
  - Changing the place back to 2 words (R2) fails 1.
- **Clean places:** "in Courtroom 4", "in Room 12B", "in Room 4B", "in Denver", "at 9:00 am in Courtroom 4" and "at Courthouse" all resolve to October 15, 2026. "in New York", "in Salt Lake City" and "in Dept. 5" give UNKNOWN, a safe fallback (nice-to-have).

### Regressions: c789e03 probe set re-run, every changed row explained
- **INFERRED → UNKNOWN, intended (F1-r):** the 7 F1-r cases.
- **INFERRED → UNKNOWN, safe fallbacks** (single-word place; TBD isn't a digit room): "in New York" and "in Courtroom TBD".
- **UNKNOWN → INFERRED October 15:** "in Room 2026-11-20" (see F1-r2; the one-line fix reverts it).
- **Unchanged:**
  - every owner row, including W1 and the 5 clean handoffs;
  - Smith v. Acme (owner Alex Thompson SUPPORTED, important-date UNKNOWN);
  - the 5-slot diff against main ce55f623 (byte-identical);
  - data/.

### Clean-checkout run (3ffc736)

Cloud agent `bc-e68b89ed`. I audited the transcript: one call per step, run sequentially, no edits.
- HEAD `3ffc736c844f8ea29bb8a1b6d8b50de80d347612`, merge-base = origin/main `ce55f623`, 0 behind / 8 ahead
- node_modules was absent before `npm ci`. `npm ci` · tsc · lint · test · build all EXIT=0
- `# tests 165 / # pass 165 / # fail 0`; `not ok` count 0
- 6 files, +1734/-46; data/, package.json and package-lock.json: 0 diff lines; git status clean
