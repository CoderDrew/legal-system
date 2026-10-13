# QA: legal-system PR #7, derive waiting-on slot (Dial-Tone, Oct 4 2026)

**PR:** https://github.com/CoderDrew/legal-system/pull/7
**Branch:** `cursor/derive-waiting-on-slot-f7b7`
**HEAD:** `dfa038a` (1 commit, +581/-14, 5 files)

This was a single, read-only review: no comments, pushes or merges. I compared files at three commits (merge base `b51f29f`, PR head `dfa038a`, main `c1cea0f`) and ran probes locally on an extracted copy of `deriveWaitingOnSlot`. I did not re-run tsc, lint, tests or build on this head, because the head must be rebased first (MF1); the exit codes need to be shown on the rebased head.

## Verdict: SHIP AFTER MUST-FIXES (3)

## Red flag 1: 49 vs 52 tests
- The branch is **not** on current main. GitHub reports `mergeable: false` (`dirty`). It is ahead 1 and behind 6, and its merge base is `b51f29f` (the PR #5 merge), which is from before PR #6.
- **No tests were deleted.** Counting `test(` in `lib/current-state-reasoning.test.ts` plus `all.test.ts`: the base has 42, PR #7 has 49 (42 + 7 new waiting-on tests), and main has 52 (42 + PR #6's 10). The branch is just missing PR #6's 10 tests and code.
- The diff doesn't revert PR #6 on its own branch, but it **will conflict** with it. Both PRs edit `lib/current-state-reasoning.ts`, the test file, `components/status-brief.tsx`, `components/mattermind-app.tsx`, and `docs/mvp/clio-catch-up-comparison.md` lines 37 and 76.

## Checks
| Check | Result | Ref |
|---|---|---|
| Based on current main | **FAIL**: base `b51f29f`, behind 6 (MF1) | - |
| Tests | 49 = 42 + 7, none deleted; after the rebase there should be 59 | `lib/current-state-reasoning.test.ts:815-` |
| Ground truth matched honestly | PASS: the test compares value, state and evidence IDs against the GT entry, with nothing hardcoded | `lib/current-state-reasoning.test.ts:815-840` |
| Ground-truth/data files untouched | PASS: none of the 5 changed files is under `data/` | - |
| UI and docs counts honest | **FAIL on the branch**: "3 slots derived · 4 predefined", but the branch wires only 2 derived functions (current-status and waiting-on). `deriveLastImportantEventSlot` isn't on this branch. (MF1) | `components/status-brief.tsx:51`, `:229`; `components/mattermind-app.tsx:12`, `:46-47`, `:178`; docs `:37`, `:76` |
| Rules general, not fixture-tuned | **FAIL** (MF2) | `lib/current-state-reasoning.ts:136-177` |
| Client-name match safe | No `RegExp` is built from the name, so nothing throws. But the substring match gives false positives and misses real names (MF2) | `:152-162` |
| SUPPORTED honest | **FAIL** for stale requests (MF3) | `:95-96`, `:187` |
| asOf cutoff | None (see optional notes) | `:28-33` |

## Probes (client "Jordan Smith" unless noted; one APPROVAL_REQUESTED event)
| Action text | Output |
|---|---|
| "Requested Jordan Smith's approval before responding." (fixture) | Client approval, SUPPORTED (matches GT) |
| "Requested Judge Lee's approval of the stipulation." | Approval (correct, fixes the PR #4 L138 issue) |
| "Requested Al's approval." with client "Alan Smith" | **Client approval** (wrong, because "al" is a substring of "alan smith") |
| "Requested Ann's approval." with client "Joanne Smith" | **Client approval** (wrong) |
| "Requested Jordan Smith’s approval." (curly apostrophe, which Outlook usually sends) | **Approval** (misses the client) |
| "Requested O'Brien's approval." with client "Pat O'Brien" | **Approval** (misses) |
| "Requested Mary-Kate Olsen's approval." with client "Mary-Kate Olsen" | **Approval** (misses: the hyphen isn't matched by `\w`) |
| "Requested Jordan Smith's approval after review of the draft." | **Review** (the `review` keyword check at L148 runs before the name check) |
| "Asked Jordan Smith to approve the revised language." | **"Revised settlement language"** (no keyword matches, so the object is shown as what we're waiting on) |
| "Requested Jordan Smith's sign-off on the settlement." | **"Revised settlement language"** |
| "Requested your approval before filing." | Client approval (an assumption; the request could be to the attorney) |
| Approval requested Sep 17, then DOCUMENT_SENT to opposing counsel Oct 1 | **Client approval, SUPPORTED** (stale) |
| Approval requested Sep 17, then MATTER_STATUS_RECORDED "Settled" Nov 1 | **Client approval, SUPPORTED** (stale) |

## Must-fixes

**MF1. Rebase onto main `c1cea0f` and keep PR #6.**
- **Where:** the whole branch; counts at `components/status-brief.tsx:51`, `:229`, `components/mattermind-app.tsx:178`, and `docs/mvp/clio-catch-up-comparison.md:37`, `:76`.
- **Fix:**
  - Rebase and resolve the conflicts in all 5 files so that `deriveLastImportantEventSlot`, its wiring in `mattermind-app.tsx`, and PR #6's 10 tests all survive.
  - Then confirm that all three derived slots are wired, so the "3 derived · 4 predefined" text is true.
  - Show real exit codes on the rebased head for tsc, lint, the tests (expect 59/59) and build.

**MF2. Waiting-on value comes from parsing action text, shaped to the fixture's sentence.**
- **Where:** `lib/current-state-reasoning.ts:136-177`, with the regex at `:152`. The doc comment at `:25-26` says "eventType and structured fields… No fixture-specific strings or regex parsing of action text", which is false.
- **What's wrong:**
  - The fixture only resolves through the `requested <name>'s approval` regex, which is the fixture's exact sentence shape. "Asked Jordan Smith to approve" or "sign-off" fall through to the object text.
  - Keyword order is fragile: `review` wins over a named approver.
  - The name match is a two-way substring test (`:159-162`). That gives false positives ("Al" for "Alan Smith") and misses curly apostrophes, apostrophes inside names, and hyphens.
- **Fix:**
  - Decide "Client approval" from structured data. The request's source artifact recipient (`to`) should resolve to the matter's client participant, through `participantIds` and the participant's email. Pass the needed participant and artifact lookups into the function. Otherwise return "Approval".
  - If a text fallback stays, mark that result INFERRED. Normalize ’ to ', match the client's full name or surname as whole tokens only, check the named approver before any keywords, and never use `object` as the value.
  - Fix the doc comment.
  - Add probe tests: a short name that's a substring of the client's name, a curly apostrophe, a non-client approver, and "approve" phrasing.

**MF3. An open approval is always SUPPORTED, even when it's clearly stale.**
- **Where:** `lib/current-state-reasoning.ts:95-96`, `:187`.
- **What's wrong:**
  - The type set has no approval-received event, so not resolving it in V1 is an honest limitation.
  - But SUPPORTED claims the wait is still open. That's only evidenced when nothing substantive happened after the request.
  - A later DOCUMENT_SENT, or a MATTER_STATUS_RECORDED of "Settled", still shows "Client approval, SUPPORTED".
- **Fix:**
  - Keep SUPPORTED only when no later (strictly later timestamp) DOCUMENT_SENT, DOCUMENT_REVIEWED, MATTER_STATUS_RECORDED or APPROVAL_REQUESTED exists for the matter. Otherwise return INFERRED.
  - The fixture stays SUPPORTED: its DOCUMENT_REVIEWED is undated and recorded at the same 17:45 time, not later.
  - Add a stale-approval test.
  - Say in the PR body or docs that approvals never resolve in V1.

## Optional notes
- There's no asOf cutoff, so events after the brief's as-of date are still used. Fine for the fixture, but add an `asOf` parameter before held-out data arrives.
- WAITING_STATE_REPORTED is superseded by *any* later DOCUMENT_SENT, APPROVAL_REQUESTED or DOCUMENT_REVIEWED, even an unrelated one. This is the same rule as current-status, so it's consistent, but it's broad.
- The "your approval means client" branch at `:143-145` is an assumption; mark it INFERRED or drop it.
- The timestamp and tie-break logic is copied from current-status (`:66-68`, `:114-131`); a shared helper would cut drift.

---

# Verification pass: head `7c6e54b` (Dial-Tone, Oct 4 2026, 11:25 AM MT)

This was the one permitted verification pass, scoped to MF1–3, and it was read-only. A fresh cloud agent ran one command at a time and left a clean tree. I reran the probes locally on an extracted copy of `deriveWaitingOnSlot` and its helper `deriveApprovalTypeFromText`.

## Verdict: NOT VERIFIED. MF1 and MF3 are fixed; MF2 is incomplete, and the head is red (4/66 tests fail, lint exits 1)

## Real results on `7c6e54b`
| Check | Result |
|---|---|
| Base | Merge base and main are both `c1cea0f`; 0 behind, 1 ahead. GitHub shows `mergeable: true`, `mergeable_state: clean` (still a draft) |
| tsc | EXIT=0 |
| lint | **EXIT=1**: 10 × `@typescript-eslint/no-explicit-any` at `tests/current-state-reasoning.test.ts:1632, 1687, 1761, 1787, 1833, 1878, 1923, 1968, 2013, 2059` (`const testEvidence: any[] = []`) |
| test | **66 tests, 62 pass, 4 fail.** The agent reported EXIT=0, but its command output was blank in the transcript; the 4 failures come from the test log summary. The builder's 66/66 is not true |
| build | EXIT=0 |
| data/ | `git diff origin/main...HEAD -- data/` gives 0 lines |

## Test count (the "25 + 10 + 14 + 17" question)
- 66 = main's 52 + 14 new. The builder's breakdown is mislabeled, but the total is right.
- My earlier 42 was the pre-PR #6 total; main is 52.
- No main tests were dropped or weakened. Diffing test names in `tests/current-state-reasoning.test.ts` between main and this head shows only additions (25 → 39). The only removed line in the test patch is the import, which was replaced by one that adds `deriveWaitingOnSlot`. No other test files changed.

## The 4 failing tests
- `:1822` "curly apostrophe", `:1912` "O'Brien" and `:1957` "Mary-Kate". I reproduced all three locally. Each expects "Client approval" and gets "Approval".
- `:1666` "matter isolation". It passes empty evidence and expects SUPPORTED, but the fallback now returns INFERRED.
- Also, the "curly apostrophe" test's action at `:1842` uses a straight `'`, so it never tests a curly apostrophe.

## MF1: VERIFIED
- The branch is rebased onto `c1cea0f` and PR #6's code and tests survive.
- `mattermind-app.tsx:30-55` wires all three derived slots, so "3 slots derived · 4 slots predefined" is now true (`status-brief.tsx:51`, `:229`; `mattermind-app.tsx:186`; docs `:37`, `:76`).
- The repo-wide checks are covered by the blocker below.

## MF3: VERIFIED
- `:266-295`: a strictly later DOCUMENT_SENT, DOCUMENT_REVIEWED, MATTER_STATUS_RECORDED or APPROVAL_REQUESTED now gives INFERRED.
- Probes: a DOCUMENT_SENT on Oct 1 and a MATTER_STATUS_RECORDED on Nov 1 both give "Client approval, INFERRED". A later WAITING_STATE_REPORTED replaces the approval wait.
- **The fixture isn't SUPPORTED by a tuned coincidence.** The only same-time event is the undated DOCUMENT_REVIEWED from the *same email* (`email-0142-client-approval`). It falls back to that email's recorded time, 17:45, which is also the approval's `occurredAt`. The tie is structural, and strict `>` is the rule I specified.
- It fails safe: if an approval's `occurredAt` were earlier than its email's recorded time, the same-email undated event would make it INFERRED, never falsely SUPPORTED.
- Optional hardening: ignore events that share the request's `sourceArtifactId`.

## MF2: NOT FIXED (remaining blocker), `lib/current-state-reasoning.ts`
The schema has no participant directory with roles or emails, so a name-to-email check is an acceptable stopgap. But it has to be exact, and the fallback has to be honest:

1. **`:360`: the text-fallback regex captures the words before the name.** For "requested o'brien's approval" it captures "requested o'brien", so the exact name check at `:370` never matches a name that follows a verb. That includes the fixture's own sentence shape and curly apostrophes. This causes 3 of the 4 test failures.
   - **Fix:** compare the *trailing* tokens of the captured phrase with the client's full name or surname, e.g. `tokens.slice(-clientTokens.length).join(" ") === client || tokens.at(-1) === surname`.
2. **`:312`: the recipient check is a substring match, which gives false "Client approval, SUPPORTED".** Probes: client Jordan Smith with `to: jordan.smithson@acme-opposing.example`, and client Al Smith with `to: hal.smith@court.example` or `val.smith@opposing.example`.
   - **Fix:** require an exact local part: `to.some(a => a.toLowerCase().split("@")[0] === client.toLowerCase().trim().split(/\s+/).join("."))`.
3. **`:319-325`: a text-fallback "Client approval" stays SUPPORTED whenever an artifact exists.** Probe: "Smith's approval requested." sent to `paralegal@lawfirm.example` gives "Client approval, SUPPORTED". That contradicts the doc comment at `:158`.
   - **Fix:** set `derivedState = "INFERRED"` whenever the fallback runs.
4. Make the head green:
   - Type `testEvidence` as `EligibleEvidenceItem[]`, which fixes lint.
   - Make the curly test use `\u2019`.
   - Have the isolation test (`:1666`) pass an artifact if it wants SUPPORTED, or assert INFERRED.
   - Show real exit codes for tsc, lint, test and build.

## Optional
- The PR body is stale: it still says 49/49, "no regex parsing of names" and "includes check". Update it before merging.

---

# Final verification: head dfe451e (MF2 only), Oct 4 2026, 11:4x AM MT

**Verdict: VERIFIED / SHIP.** All four MF2 items are fixed. MF1 and MF3 were already verified at 7c6e54b and are unchanged.

## MF2 items
1. **L360 regex captured words before the name.** Fixed. It is now anchored to `(?:requested|asked)\s+` and captures only the name. Probes "Smith's approval requested" to a paralegal and "Al" with client Alan Smith both give Approval.
2. **L312 recipient substring match.** Fixed. L308–315 now require an exact email local-part match. Probes jordan.smithson@, hal.smith@ and val.smith@ give Approval / INFERRED. jordan.smith@example.com gives Client approval / SUPPORTED, including with mixed-case and multiple recipients.
3. **Text-fallback "Client approval" stayed SUPPORTED.** Fixed. L320–329 always set INFERRED on the text fallback. The curly apostrophe, O'Brien and Mary-Kate give Client approval / INFERRED.
4. **Head was red.** Fixed. The cloud agent ran one call at a time, sequentially; I checked its transcript for real exit codes:
   - `npx tsc --noEmit` EXIT=0
   - `npm run lint` EXIT=0 (the 10 `no-explicit-any` errors are gone; `any[]` became `EligibleEvidenceItem[]`)
   - `npm test > /tmp/test.log` EXIT=0. The agent reports `# tests 69 / # pass 69 / # fail 0`. The transcript did not record that grep's raw output, but the exit code is real and the count matches my static count: 66 + 3 new tests, with no main tests removed.
   - `npm run build` EXIT=0

## Other checks
- Smith v. Acme fixture: still Client approval / SUPPORTED, via the exact jordan.smith@example.com recipient. The fixture email in data/ is `jordan.smith@example.com`.
- data/: `git diff origin/main...HEAD -- data/ | wc -l` = 0. Untouched.
- Test edits since 7c6e54b are legitimate. Recipient emails changed for exact matching, the isolation test asserts INFERRED for the text fallback, and the curly test uses `\u2019`.
- Mergeable: GitHub shows mergeable true, state clean. Base and merge-base are c1cea0f, 0 behind and 2 ahead, 5 files, +1357/-19. git status is clean.

## Optional (not blocking)
- The PR body says the fixture email is `jordan.smith@acme-company.example`, but it is `jordan.smith@example.com`. Also update its stale counts and claims.
- Some cases under-claim, which is the safe direction because they are INFERRED/Approval and never a false SUPPORTED. "the client Jordan Smith's approval" gives Approval. "client’s approval" with a curly apostrophe gives Approval, because the keyword checks use the un-normalized `actionLower`. "Jordan Smith's approval requested" with no verb gives Approval.
- The PR is still a draft. Mark it ready before merging.
