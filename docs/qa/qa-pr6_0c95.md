# QA: legal-system PR #6, derive last-important-event slot (Dial-Tone, Oct 4 2026)

**PR:** https://github.com/CoderDrew/legal-system/pull/6
**Branch:** `cursor/derive-last-important-event-slot-9aa9`
**HEAD:** `b33eab9`

This was a single, read-only review: no comments, pushes or merges. The checks ran on a cloud agent, one command at a time, and its tree was left clean. Probes ran locally on an extracted copy of `deriveLastImportantEventSlot`, using the fixture's 7 events.

## Verdict: SHIP AFTER MUST-FIXES (4)

## Checks
| Check | Result | Ref |
|---|---|---|
| Typecheck, tests, build | PASS: tsc exit 0; 51/51 tests pass; build exit 0 | - |
| Lint | Exit 0 reported, but that exit code came from `tail`, so it's weak evidence | - |
| Ground-truth/data files untouched | PASS: `git diff origin/main...HEAD -- data/` is empty | - |
| UI counts honest | PASS: "2 slots derived · 5 slots predefined" | `components/status-brief.tsx:51`, `:229`; `components/mattermind-app.tsx` empty-state copy |
| Docs counts | **FAIL**: stale after merge (MF4) | `docs/mvp/clio-catch-up-comparison.md:37`, `:76` (on main) |
| Rules general, not fixture-tuned | **FAIL** (MF1, MF2) | `lib/current-state-reasoning.ts:14`, `:92-96` |
| SUPPORTED is honest | Mostly: the value is a paraphrase of one dated event; see the optional notes | `:137-138` |
| `occurredAt` vs `sourceRecordedAt` | Sound: use `occurredAt` when present, else the recorded time; on a tie, a dated event beats an undated one | `:42-58` |

## Mutations (each run sequentially and confirmed by diff)
Removing any one of these rules fails only the ground-truth test (#42):
- the `before responding` regex (M1);
- the occurredAt tie preference (M2);
- the Attorney actor mapping (M4);
- the `of the {object}` append (M5).

All four are needed to reproduce the single fixture sentence.

## Probes
Each row changes only the approval-request action, unless the change is noted:

| # | Change | Output |
|---|---|---|
| P0 | none (fixture) | "September 17, 2026 — Attorney requested client approval of the revised settlement language." (matches GT) |
| P1 | "Requested Jordan Smith's approval by Friday." | "…Attorney requested client's approval by Friday." |
| P9 | "Requested Jordan Smith's review before responding." | "…Attorney requested client's review before responding." |
| P3 | "Requested Jordan's approval before responding." | "…Attorney requested Jordan's approval before responding." |
| P4 | adds a Clio MATTER_STATUS_RECORDED event on Sep 18 | "September 18, 2026 — Recorded the matter status as Active." |
| P5 | client "Jordan Smith (Trustee" | **throws** `Invalid regular expression` |
| P6 | client "J."; action "Requested JX's approval." | "…requested client's approval." (false match) |
| P7 | approval at 2026-09-18T03:30Z (9:30 PM MT on Sep 17) | "September 18, 2026 — …" |

## MUST-FIX
**MF1. A fixture-phrase regex produces the ground-truth sentence** (`lib/current-state-reasoning.ts:92-96`, chained with `:98-113`).
- `/requested client's approval before responding\.?$/` matches only the fixture action at `data/synthetic-matter.ts:283`.
- Any other wording (P1, P9) produces a differently shaped sentence, so the January held-out matter gets different behavior from the fixture.
- **Fix:** replace the phrase regexes with a template keyed on `eventType`. For APPROVAL_REQUESTED, use "{actor role} requested {approver role} approval of the {object}", taking the approver role from a name lookup against the matter (see MF3). Keep the raw action text as the fallback for unknown types.

**MF2. "All operational events are important"** (`:14` and the selection at `:42-58`).
- A routine Clio record that's later than the last real event becomes the "last important event" (P4).
- The ground-truth rationale says "most recent **substantive** operational event". The test at `tests/current-state-reasoning.test.ts:968-1010` locks in the wrong behavior.
- **Fix:** exclude record-keeping types (MATTER_STATUS_RECORDED, RESPONSIBILITY_RECORDED) from selection, or allow-list substantive types. Change the `:968` test to assert that a record-keeping event isn't selected when a substantive event exists.

**MF3. Client-name replacement builds an unescaped regex from data** (`:89`).
- A client name with an unclosed bracket crashes the derivation (P5).
- A name containing regex characters matches the wrong text (P6: "J." also replaced "JX").
- Only the exact full name is replaced (P3).
- **Fix:** escape the name before building the regex (`replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`) and add word boundaries. Add one test with a regex character in the client name.

**MF4. The docs count goes stale on merge** (`docs/mvp/clio-catch-up-comparison.md:37`, `:76` on main).
- Both lines say only current-status is derived and "the other six slots are still predefined".
- The PR branch was cut before this doc landed on main, so it is missing main's newer commits, including the doc.
- **Fix:** rebase on main, then update both lines to say current-status and last-important-event are derived and the other five are predefined.

## Optional (non-blocking)
- `:68`: dates are formatted in UTC. An event at 9:30 PM MT shows the next day (P7). That's fine while the ground truth is UTC (`asOf` is UTC), but use the firm's zone before real matters.
- `:137-138`: the "Attorney"/"client" substitutions rely on the Clio matter record, but only the email is cited. Citing the record would need a ground-truth decision from Drew, since the ground truth can't be edited here, so leave it.
- No `asOf` cutoff is applied. An event after the as-of date, or a future-dated `occurredAt`, would be selected.
- The test at `tests/current-state-reasoning.test.ts:924` reuses the exact fixture action string and asserts only `includes`.
