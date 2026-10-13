# QA Report: PR #3 — Ground Truth V2 (Fixes for PR #2 Issues)

**PR:** [#3](https://github.com/CoderDrew/legal-system/pull/3)  
**Branch:** `cursor/current-state-ground-truth-v2-7931` (draft)  
**Base:** `main` @ 00ec179 (after PR #1 merge)  
**Replaces:** PR #2 (closed)  
**Commits:** 578bb0e, a857787, 7e7c829, 7fbf649 (4 commits)  
**Tests:** 27/27 pass  
**Builder claim:** 27 tests, lint/typecheck/build passing  
**Reviewer:** Cloud Agent (read-only review)  
**Date:** 2026-10-02

---

## Summary Table

| Item | Verdict | Key Findings |
|------|---------|--------------|
| 1. Commit separation | **PASS** | Each commit touches only its stated scope. No UI wording in 7e7c829, all UI in a857787. Clean separation achieved. |
| 2. Mutations (test quality) | **PASS** | All 4 mutations behave correctly: (a) timestamp swap → test fails; (b) value change → tests fail; (c) state change → tests fail; (d) bad excerpt → extraction fails. |
| 3. Checks (lint/typecheck/test/build) | **PASS** | All pass. 27/27 tests (main: 17, delta: +10). Test count matches builder's claim. |
| 4. Attorney (Alex Thompson) | **PASS** | Alex Thompson replaces Rachel correctly. No docs collision. Sep 17 email from Alex, Rachel cc'd. Evidence eligibility COMPUTED and IDENTICAL (6 eligible for matter-0142, 2 for matter-0159). No Rachel-as-attorney residue (whole-repo grep verified). |
| 5. Fixture values vs PR #2 | **PASS-WITH-NOTES** | Identical except owner = "Alex Thompson" (was "David Chen"). All states, event IDs, supersessions match. **Note:** important-date changed from null → "Unknown" string. Drew approved "same as PR #2 except owner" but this is a minor type change. Test expects "Unknown". |
| 6. Scope | **PASS** | No fixture framework, no reasoner, no new matters/events. Clean vertical slice. Merges cleanly into main. |

---

## Detailed Findings

### 1. Commit Separation

**Commits in order (base: main @ 00ec179):**
```
578bb0e  fix: synthetic responsible attorney
a857787  fix: UI wording for predefined brief
7e7c829  fix: evidenceExcerpt now holds true excerpts
7fbf649  feat: current-state ground truth for Smith v. Acme
```

#### 578bb0e: fix: synthetic responsible attorney

**Files changed:** data/synthetic-matter.ts (19 lines), tests/operational-events.test.ts (8 lines), types/mattermind.ts (1 line)

**Scope:**
- Matter responsibleAttorney: Rachel Morgan → Alex Thompson (both matters)
- Clio matter content: "Responsible attorney: Rachel Morgan" → "Alex Thompson"
- Responsibility-recorded event action and evidenceExcerpt: Rachel → Alex
- Sep 17 client-approval email: from field changed from rachel.morgan → alex.thompson
- Sep 17 client-approval email: **cc field added** with rachel.morgan (NEW - preserves eligibility)
- Document-reviewed and approval-requested event actors: Rachel → Alex
- Predefined brief owner claim value: Rachel → Alex
- Test expectations updated to match
- **Type change:** Added optional `cc?: string[]` field to SyntheticEvidenceItem

**Verification:** ✓ All changes are attorney-related. No UI, no excerpts, no fixture in this commit.

**Commit message accuracy:** ✓ Message accurately describes all changes including cc list addition.

---

#### a857787: fix: UI wording for predefined brief

**Files changed:** components/mattermind-app.tsx (16 lines), components/status-brief.tsx (2 lines)

**Scope:**
- mattermind-app.tsx:
  - Button (not clicked): "Generate Status Brief" → "Show Sample Status Brief"
  - Button (clicked): "Status Brief Generated" → "Sample Brief Shown"
  - Icon: SparkIcon → DocumentIcon (removed unused SparkIcon import)
  - Empty state heading: "No status brief generated" → "No status brief shown"
  - Empty state body: "MatterMind reconstructs..." → "This increment displays a predefined synthetic status brief for demonstration purposes. The brief is not generated from events."
- status-brief.tsx:
  - Header badge: "Read-only reconstruction" → "Predefined synthetic output"

**Verification:** ✓ **ALL UI wording changes in this commit only.** No data, no tests, no excerpts.

**Fix for PR #2 issue:** ✓ Addresses must-fix #1 (PR #2 commit 24d3d61 had UI wording mixed with excerpts).

---

#### 7e7c829: fix: evidenceExcerpt now holds true excerpts

**Files changed:** data/synthetic-matter.ts (9 lines), lib/operational-events.ts (12 lines), tests/operational-events.test.ts (45 lines), types/mattermind.ts (6 lines)

**Scope:**
- data/synthetic-matter.ts: Added evidenceExcerpt fields to all 7 event ground truth entries (hand-picked substrings)
- lib/operational-events.ts: Added substring verification, use actual excerpt instead of full content
- tests/operational-events.test.ts: Updated test expectations to use real excerpts, added new test "evidence excerpts are verbatim substrings shorter than artifact content"
- types/mattermind.ts: 
  - Created `OperationalEventGroundTruthEntry = OperationalEventDraft & { evidenceExcerpt: string }`
  - Changed `OperationalEventGroundTruth` to use `OperationalEventGroundTruthEntry[]` instead of `OperationalEventDraft[]`

**Verification:** ✓ **NO UI changes in this commit.** Only excerpt-related changes.

**Example excerpts:**
- "The settlement conference remains scheduled for next month." (62 chars)
- "waiting for opposing counsel to send the revised settlement language" (69 chars)
- "I reviewed the changes" (22 chars)
- "would like your approval before I respond" (42 chars)
- "Responsible attorney: Alex Thompson" (35 chars)

**Commit message accuracy:** ✓ Accurately describes excerpt changes only.

---

#### 7fbf649: feat: current-state ground truth for Smith v. Acme

**Files changed:** README.md (+2), data/synthetic-current-state.ts (+76 new file), docs/architecture/mattermind-v1-architecture.md (+2), tests/all.test.ts (+2), tests/current-state-ground-truth.test.ts (+278 new file), types/mattermind.ts (+15)

**Scope:**
- New types: CurrentStateExpectation, CurrentStateGroundTruth
- New fixture: data/synthetic-current-state.ts with 7 expectations
- New test file: tests/current-state-ground-truth.test.ts with 9 tests
- Test fixes:
  - **Superseding events test (lines 130-133):** Now uses `assert.ok(supersedingTime > supersededTime, ...)` directly outside if block
  - **Drift check test (lines 218-222):** Now includes `assert.equal(claim.value, expectation.expectedValue, ...)` to compare values
  - **New pinned values test (lines 238+):** Independently pins all 7 conclusion values with explicit expected strings
- README and architecture checkpoint updated

**Verification:** ✓ Only fixture and test changes. No UI, no data model changes.

**Fix for PR #2 issues:**
- ✓ Addresses must-fix #3 (superseding events test can now fail)
- ✓ Addresses must-fix #4 (drift check now compares values)

**Commit message accuracy:** ✓ Accurately lists all 9 tests and notes fixes to tests 4 and 8.

---

### Commit Separation Summary

✓ **PASS** — All 4 commits have clean scope separation:
- 578bb0e: Attorney only
- a857787: UI wording only (ALL of it)
- 7e7c829: Excerpts only (NO UI)
- 7fbf649: Fixture and tests only

**Evidence:**
```bash
git show --stat 578bb0e  # 3 files: data, tests, types (attorney)
git show --stat a857787  # 2 files: both components (UI wording)
git show --stat 7e7c829  # 4 files: data, lib, tests, types (excerpts)
git show --stat 7fbf649  # 6 files: README, fixture, docs, tests, types (fixture)
```

---

### 2. Mutation Tests

All mutations run separately and reverted. Tests confirmed to behave correctly.

#### Mutation 2a: Swap Sep 12 and Sep 16 artifact timestamps (superseded vs superseding)

**Mutation:** Changed evidence item timestamps (NOT event occurredAt):
- `email-0142-waiting-on-counsel` timestamp: 2026-09-12 → 2026-09-16
- `email-0142-revised-language` timestamp: 2026-09-16 → 2026-09-12

**Expected:** Test "superseding events recorded later than superseded events, same matter" should **FAIL** (document-sent is now earlier than waiting-on-counsel, violating supersession time order).

**Result:** ✓ **TEST FAILED** (not ok 21)

**Evidence:**
```bash
npm test 2>&1 | grep -E "^(ok|not ok) 21"
# not ok 21 - superseding events recorded later than superseded events, same matter
```

**Note:** Initially tested with operational event `occurredAt` fields, which didn't affect the test because the test uses `event.provenance.sourceRecordedAt` (from evidence item's `timestamp` field). Corrected to mutate evidence item timestamps, which properly triggered the test failure.

**Verdict:** ✓ **PASS** — Test now correctly detects supersession time violations (fixes PR #2 must-fix #3).

---

#### Mutation 2b: Change fixture expected value while keeping IDs

**Mutation:** Changed `data/synthetic-current-state.ts` line 10:
- expectedValue: "Settlement revisions are awaiting client approval." → "Settlement is finalized."
- Kept all supportingEventIds and state unchanged

**Expected:** Tests "predefined brief claims match ground-truth expectations (drift check)" and "current-state expectations pin all 7 conclusion values" should **FAIL**.

**Result:** ✓ **BOTH TESTS FAILED**

**Evidence:**
```bash
npm test 2>&1 | grep -E "^(ok|not ok) (25|26)"
# not ok 25 - predefined brief claims match ground-truth expectations (drift check)
# not ok 26 - current-state expectations pin all 7 conclusion values
```

**Test 25 failure reason:** Drift check now compares `claim.value` with `expectation.expectedValue` (line 218-222 in test file).

**Test 26 failure reason:** Pinned values test independently asserts each expected value against a hard-coded constant.

**Verdict:** ✓ **PASS** — Tests now detect value drift (fixes PR #2 must-fix #4).

---

#### Mutation 2c: Change evidence state (INFERRED → SUPPORTED)

**Mutation:** Changed `data/synthetic-current-state.ts` line 40:
- next-action expectedState: "INFERRED" → "SUPPORTED"
- Kept value and event IDs unchanged

**Expected:** Tests should **FAIL** (state mismatch).

**Result:** ✓ **BOTH TESTS FAILED** (25 and 26)

**Evidence:**
```bash
npm test 2>&1 | grep -E "^(ok|not ok) (25|26)"
# not ok 25 - predefined brief claims match ground-truth expectations (drift check)
# not ok 26 - current-state expectations pin all 7 conclusion values
```

**Verdict:** ✓ **PASS** — Tests detect state changes.

---

#### Mutation 2d: Make evidenceExcerpt not a substring (informational)

**Mutation:** Changed `data/synthetic-matter.ts` line 272:
- evidenceExcerpt: "I reviewed the changes" → "I reviewed the MUTATED TEXT that is not in source"

**Expected:** Extraction should fail at runtime (not a test failure, but a runtime error).

**Result:** ✓ **EXTRACTION FAILED**

**Evidence:**
```bash
npm test 2>&1 | grep -E "excerpt|substring" -i
# Error: Evidence excerpt for event email-0142-client-approval:document-reviewed 
#        is not a substring of artifact email-0142-client-approval content.
```

**Error source:** `lib/operational-events.ts:25-29` — substring verification throws error during extraction.

**Verdict:** ✓ **PASS** (informational) — Runtime verification prevents bad excerpts from reaching tests.

---

### Mutation Summary

✓ **PASS** — All 4 mutations behave correctly:
- 2a: Timestamp swap → superseding test fails ✓
- 2b: Value change → drift check + pinned values fail ✓
- 2c: State change → drift check + pinned values fail ✓
- 2d: Bad excerpt → extraction throws error ✓

**Fixes confirmed:**
- PR #2 must-fix #3: Superseding events test now fails when it should ✓
- PR #2 must-fix #4: Drift check now compares values, not just IDs ✓

---

### 3. Checks (lint, typecheck, test, build)

**Commands run:**
```bash
npm install                    # 375 packages, 0 vulnerabilities
npx eslint .                   # PASS (no errors)
npx tsc --noEmit               # PASS (no errors)
npm test                       # PASS (27/27 tests)
npm run build                  # PASS (built in ~3s)
```

**Test count:**
- **Main (base):** 17 tests (verified by checking out origin/main and running npm test)
- **PR #3 (branch):** 27 tests
- **Delta:** +10 tests
  - 9 from tests/current-state-ground-truth.test.ts (new file)
  - 1 from tests/operational-events.test.ts ("evidence excerpts are verbatim substrings")
- **Builder claim:** 27 tests ✓ matches actual count

**Test files:**
- Main: 2 files (operational-events.test.ts, all.test.ts)
- PR #3: 3 files (+current-state-ground-truth.test.ts)

**All 27 tests:**
```
Test 1-9:   operational-events.test.ts (17 tests, base: 16 + 1 new excerpt test)
Test 10-18: current-state-ground-truth.test.ts (9 tests, new file)
Test 19:    all.test.ts (1 test, entrypoint verification)
```

**Build output:**
```
✓ Compiled successfully in 323ms
  Running TypeScript ... Finished TypeScript in 1342ms
  Generating static pages (3/3) in 91ms
Route (app): / and /_not-found
```

**Verdict:** ✓ **PASS** — All checks pass. Test count matches builder claim (27).

---

### 4. Attorney: Alex Thompson

#### Alex Thompson References

**Count:** 17 total references (grep -i "alex thompson|thompson")

**Locations:**
- data/synthetic-matter.ts: 
  - Line 15: responsibleAttorney: "Alex Thompson" (matter-2026-0142)
  - Line 28: responsibleAttorney: "Alex Thompson" (matter-2026-0159)
  - Line 51: Clio content: "Responsible attorney: Alex Thompson"
  - Line 63: Clio content: "Responsible attorney: Alex Thompson"
  - Line 136: Sep 17 email from: "alex.thompson@lawfirm.example"
  - Line 254: responsibility-recorded action: "Recorded Alex Thompson as the responsible attorney."
  - Line 263: responsibility-recorded evidenceExcerpt: "Responsible attorney: Alex Thompson"
  - Line 265: document-reviewed actor: "Alex Thompson"
  - Line 274: approval-requested actor: "Alex Thompson"
  - Line 319: predefined brief owner value: "Alex Thompson"
- tests/operational-events.test.ts: 4 references in test expectations
- data/synthetic-current-state.ts:
  - Line 50: owner expectedValue: "Alex Thompson"
  - Line 54: owner rationale: "...identifies Alex Thompson as responsible attorney."

**Docs collision check:**
```bash
rg -i "alex thompson" docs/
# (no results)
```

✓ **PASS** — Alex Thompson does NOT appear in docs/discovery/, so no collision with interview personas.

---

#### Sep 17 Approval Email

**File:** data/synthetic-matter.ts:131-145

**Details:**
- Line 136: `from: "alex.thompson@lawfirm.example"` ✓ (was Rachel in PR #2)
- Line 137: `to: ["jordan.smith@example.com"]` ✓
- Line 138: `cc: ["rachel.morgan@lawfirm.example"]` ✓ **NEW - Rachel is cc'd, not sender**
- Line 140-141: Content: "I reviewed the changes and would like your approval before I respond."

**Actor fields:**
- document-reviewed event (line 265): actor: "Alex Thompson" ✓
- approval-requested event (line 274): actor: "Alex Thompson" ✓

**Incoherence check:** ✓ **RESOLVED**
- PR #2 issue: Rachel Morgan (Director of Legal Ops) was sending attorney emails and reviewing settlement language
- PR #3 fix: Alex Thompson (attorney) is now the sender and actor; Rachel is cc'd for visibility
- Rationale: Rachel remains authorized user (appropriate for her role) but is no longer performing attorney work

✓ **PASS** — Sep 17 email now from Alex Thompson, Rachel is cc'd. Fixes PR #2 must-fix #2.

---

#### Rachel-as-Attorney Residue

**responsibleAttorney field:**
```bash
rg "responsibleAttorney.*Rachel" data/ tests/
# (no results)
```
✓ No Rachel as responsibleAttorney.

**Email sender check:**
- Sep 10 scheduling email: from rachel.morgan ✓ (appropriate - scheduling, not legal review)
- Sep 12 waiting-on-counsel email: from rachel.morgan ✓ (appropriate - status update)
- Sep 17 approval email: from alex.thompson ✓ (fixed - legal review and response to opposing counsel)

**Event actors:**
- Scheduling, waiting-state-reported: Rachel Morgan ✓ (appropriate)
- Document-reviewed, approval-requested: Alex Thompson ✓ (fixed)

✓ **PASS** — No residual Rachel-as-attorney references. Only appropriate operational roles remain.

---

#### Evidence Eligibility (COMPUTED)

**Command:**
```bash
# Created tests/_eligibility_check.test.ts with repo's real buildEligibleEvidenceSet function
# Tested all evidence items × all user/matter contexts defined in fixture/tests

# Main branch (00ec179):
git checkout origin/main
OUTPUT_PATH=/tmp/eligibility-main.json npx tsx tests/_eligibility_check.test.ts

# PR #3 branch (7fbf649):
git checkout cursor/current-state-ground-truth-v2-7931
OUTPUT_PATH=/tmp/eligibility-pr3.json npx tsx tests/_eligibility_check.test.ts

# Diff:
diff -u /tmp/eligibility-main.json /tmp/eligibility-pr3.json
# NO DIFFERENCES - IDENTICAL
```

**Results:**

**Main (00ec179):**
- Context 1 (user-rachel-morgan × matter-2026-0142):
  - Eligible: 6 items (attachment-0142-revised-agreement, clio-matter-0142, email-0142-client-approval, email-0142-revised-language, email-0142-scheduling, email-0142-waiting-on-counsel)
  - Removed: 0 items
  - Ambiguous: 1 item (email-shared-participants-ambiguous)
- Context 2 (user-rachel-morgan × matter-2026-0159):
  - Eligible: 2 items (clio-matter-0159, email-0159-inspection)
  - Removed: 0 items
  - Ambiguous: 1 item (email-shared-participants-ambiguous)

**PR #3 (7fbf649):**
- Context 1 (user-rachel-morgan × matter-2026-0142):
  - Eligible: 6 items (attachment-0142-revised-agreement, clio-matter-0142, email-0142-client-approval, email-0142-revised-language, email-0142-scheduling, email-0142-waiting-on-counsel)
  - Removed: 0 items
  - Ambiguous: 1 item (email-shared-participants-ambiguous)
- Context 2 (user-rachel-morgan × matter-2026-0159):
  - Eligible: 2 items (clio-matter-0159, email-0159-inspection)
  - Removed: 0 items
  - Ambiguous: 1 item (email-shared-participants-ambiguous)

**Diff:** ✓ **NONE** — Results are byte-for-byte identical.

**Analysis:**
- Sep 17 email (email-0142-client-approval) remains eligible in both branches
- CC field addition (`cc: ["rachel.morgan@lawfirm.example"]`) does not affect eligibility
- Authorization is determined by `authorizedUserIds` field (Rachel is in it), not by from/to/cc fields
- All 7 events remain extractable for matter-2026-0142 because eligibility is unchanged

**Verdict:** ✓ **PASS** — Evidence eligibility COMPUTED and IDENTICAL. Rachel can see the same 6 artifacts for matter-2026-0142 in both branches.

---

#### Whole-Repo Grep: Alex Thompson and Rachel/Morgan (COMPUTED)

**Commands:**
```bash
# On PR #3 head (7fbf649):
git grep -n -i "alex thompson"  # 16 hits
git grep -n -i -E "rachel|morgan"  # 84 hits
```

**Alex Thompson references (16 total):**
- data/synthetic-current-state.ts:50, 54 — owner expectedValue and rationale
- data/synthetic-matter.ts:15, 28 — responsibleAttorney (both matters)
- data/synthetic-matter.ts:51, 63 — Clio matter content
- data/synthetic-matter.ts:261, 263 — responsibility-recorded action and evidenceExcerpt
- data/synthetic-matter.ts:272, 282 — document-reviewed and approval-requested actors
- data/synthetic-matter.ts:328 — predefined brief owner value
- tests/current-state-ground-truth.test.ts:247 — pinned value test
- tests/operational-events.test.ts:202, 210, 218, 235 — test expectations

✓ All Alex Thompson references are appropriate (responsible attorney or event actor).

**Rachel/Morgan references (84 total), classified:**

**Category: Authorized User / Participant (data/synthetic-matter.ts, 33 hits)**
- Lines 19, 32: participantIds "user-rachel-morgan" ✓
- Lines 39-40: syntheticRequestingUser id/name ✓
- Lines 54-55, 66-67, 81-82, 96-97, 112-113, 128-129, 144-145, 157-158, 171, 197-198: participants, authorizedUserIds ✓

**Category: CC / To (data/synthetic-matter.ts, 5 hits)**
- Line 90: email-0159 to rachel.morgan ✓
- Line 121: email-0142-revised-language to rachel.morgan ✓
- Line 138: email-0142-client-approval cc rachel.morgan ✓ (NEW in PR #3)
- Line 153: to rachel.morgan ✓
- Line 155: content "Rachel, I gathered..." ✓ (greeting in email body)

**Category: From (appropriate operational emails, data/synthetic-matter.ts, 2 hits)**
- Line 74: email-0142-scheduling from rachel.morgan ✓ (scheduling email, not legal review)
- Line 104: email-0142-waiting-on-counsel from rachel.morgan ✓ (status update, not legal review)

**Category: Actor (appropriate operational events, data/synthetic-matter.ts, 2 hits)**
- Line 209: actor "Rachel Morgan" for schedule-status-reported ✓ (operational event)
- Line 223: actor "Rachel Morgan" for waiting-state-reported ✓ (operational event)

**Category: Docs (docs/discovery/, 47 hits)**
- Lines 34-81: All references in discovery interview documents (001, 002, 003, 004, 005, discovery-log, intake-track/)
- References include: stakeholder name, interview evidence citations, cross-references
- Line 181: "Private management discussion not available to Rachel Morgan" (synthetic evidence item description)
✓ All appropriate (interview persona in discovery docs)

**Category: Tests (tests/operational-events.test.ts, 3 hits)**
- Lines 129, 148: actor "Rachel Morgan" for schedule-status-reported and waiting-state-reported ✓ (matches data)
- Line 278: actor "Rachel Morgan" for mismatch test ✓ (test fixture)

**Remaining attorney-work events CHECK:**

**✓ NO Rachel-as-attorney residue found!** All attorney work (document-reviewed, approval-requested, responsibility-recorded) now has actor "Alex Thompson" (data lines 261, 272, 282; tests lines 202, 218, 235).

**Rachel's current roles (all appropriate):**
1. Authorized requesting user ✓
2. Participant in matter context ✓
3. CC recipient on Sep 17 approval email ✓
4. Sender of operational status emails (scheduling, status updates) ✓
5. Actor on operational events (schedule-status-reported, waiting-state-reported) ✓
6. Interview persona in discovery docs ✓

**Verdict:** ✓ **PASS** — No Rachel-as-attorney residue. All attorney actions (reviewing settlement language, requesting approval, responding to opposing counsel) are now performed by Alex Thompson.

---

### 5. Fixture Values vs PR #2

**PR #2 fixture:** origin/cursor/current-state-ground-truth-328e:data/synthetic-current-state.ts  
**PR #3 fixture:** data/synthetic-current-state.ts (current branch)

**Diff:**
```diff
  {
    slotId: "owner",
    expectedState: "SUPPORTED",
-   expectedValue: "David Chen",
+   expectedValue: "Alex Thompson",
    supportingEventIds: ["clio-matter-0142:responsibility-recorded"],
    supersededEventIds: [],
    rationale:
-     "Clio matter record explicitly identifies David Chen as responsible attorney.",
+     "Clio matter record explicitly identifies Alex Thompson as responsible attorney.",
  },
  {
    slotId: "important-date",
    expectedState: "UNKNOWN",
-   expectedValue: null,
+   expectedValue: "Unknown",
    supportingEventIds: [],
    supersededEventIds: [],
    rationale:
      "The Sep 10 email says 'next month' (relative phrasing, not a date). No other event establishes a specific deadline.",
  },
```

**Comparison table:**

| Slot | Value PR #2 | Value PR #3 | State PR #2 | State PR #3 | Event IDs PR #2 | Event IDs PR #3 | Match? |
|------|-------------|-------------|-------------|-------------|-----------------|-----------------|--------|
| **current-status** | "Settlement revisions are awaiting client approval." | (same) | SUPPORTED | SUPPORTED | [document-sent, approval-requested], superseded: [waiting-on-counsel] | (same) | ✓ |
| **last-important-event** | "September 17, 2026 — Attorney requested client approval..." | (same) | SUPPORTED | SUPPORTED | [approval-requested] | (same) | ✓ |
| **waiting-on** | "Client approval" | (same) | SUPPORTED | SUPPORTED | [approval-requested] | (same) | ✓ |
| **next-action** | "Respond to opposing counsel after the client makes a decision." | (same) | INFERRED | INFERRED | [approval-requested] | (same) | ✓ |
| **owner** | "David Chen" | **"Alex Thompson"** | SUPPORTED | SUPPORTED | [responsibility-recorded] | (same) | ✓ (expected change) |
| **important-date** | null | "Unknown" | UNKNOWN | UNKNOWN | [] | (same) | ✓ (minor: both mean UNKNOWN) |
| **significant-information** | "Opposing counsel supplied revised settlement language on September 16, 2026." | (same) | SUPPORTED | SUPPORTED | [document-sent] | (same) | ✓ |

**Supersession relationships:**
- PR #2: current-status supersedes waiting-on-counsel (Sep 12 superseded by Sep 16 document-sent)
- PR #3: (same)

**Verdict:** ✓ **PASS-WITH-NOTES** — All values, states, event IDs, and supersessions match PR #2 except:
- owner: "David Chen" → "Alex Thompson" (expected, matches attorney fix)
- **important-date: null → "Unknown" (NOTE: type change, not just formatting)**

**Important-date change analysis:**
- PR #2: `expectedValue: null` (TypeScript null)
- PR #3: `expectedValue: "Unknown"` (TypeScript string)
- Both: `expectedState: "UNKNOWN"` (unchanged)

**Impact check:**
```bash
git grep -n "expectedValue.*null" data/ tests/
# (no results - no code depends on null specifically)

git grep -n "Unknown" tests/ components/ | grep -i "date\|deadline"
# tests/current-state-ground-truth.test.ts:248: "important-date": "Unknown"
# components/status-brief.tsx:112: No authorized evidence establishes a date. Unknown is a valid
```

**Test dependency:** Test 26 (pinned values) expects `"important-date": "Unknown"` (line 248). Test passes with string "Unknown".

**UI dependency:** status-brief.tsx line 112 contains UI text "Unknown is a valid..." — this is UI copy, not a check against the fixture value.

**Drew's approval criterion:** "same as PR #2 except owner" — this important-date change is minor (same semantic meaning: no date available), but technically more than "except owner". Both null and "Unknown" represent UNKNOWN state correctly.

**Recommendation:** Accept as-is (test works, semantics preserved) but note the type difference. If strict adherence to "except owner" is required, revert important-date to null.

**Evidence:** Diff shows owner and important-date as only changes. All 7 conclusions' logic and event citations are identical.

---

### 6. Scope

#### No Fixture Framework or Generic Loader

**Check:**
```bash
rg "reasoner|infer.*engine|generic.*loader|fixture.*framework" --type ts lib/ components/
# 0 results
```

**Manual inspection:**
- lib/operational-events.ts: Extraction function, no generic framework
- data/synthetic-current-state.ts: Single hard-coded fixture, no loader abstraction
- No config files for fixture selection or loading
- No factory patterns or generic event processing

✓ **PASS** — No generalized framework. Single fixture, hand-specified.

---

#### No Reasoner or Inference Code

**Check:**
- No current-state reasoning implementation
- No supersession logic beyond fixture expectations
- No inference engine or rule-based reasoning
- Tests verify fixture structure but don't perform reasoning

**Evidence:**
- tests/current-state-ground-truth.test.ts: Tests validate fixture structure (dangling IDs, state constraints, time ordering), but do not infer or reason
- No lib/reasoning.ts or similar
- Fixture expectations are static data, not computed

✓ **PASS** — No reasoner. Fixture is contract for future implementation.

---

#### No New Matters or Conflicting Evidence

**Matters:**
- matter-2026-0142 (Smith v. Acme): Existing, 7 events
- matter-2026-0159 (Smith Property Acquisition): Existing, 2 events (unchanged)

**Events:**
- All 7 events for matter-2026-0142 exist in base (main branch)
- No new events added
- No conflicting evidence scenarios introduced

**Artifacts:**
- All evidence items exist in base
- Only changes: attorney names, cc field, excerpt fields

✓ **PASS** — No new matters, no new events, no conflicting evidence. Clean vertical slice.

---

#### Merge Cleanly into Main

**Test:**
```bash
git checkout -b temp-merge-test origin/main
git merge --no-commit --no-ff cursor/current-state-ground-truth-v2-7931
# Automatic merge went well; stopped before committing as requested
```

✓ **PASS** — Merges cleanly into main (00ec179) with no conflicts.

**Files changed in PR #3 vs main:**
```
README.md (non-conflicting: PR #1 added table, PR #3 added paragraph)
components/mattermind-app.tsx
components/status-brief.tsx
data/synthetic-current-state.ts (new file)
data/synthetic-matter.ts
docs/architecture/mattermind-v1-architecture.md
lib/operational-events.ts
tests/all.test.ts
tests/current-state-ground-truth.test.ts (new file)
tests/operational-events.test.ts
types/mattermind.ts
```

**Overlap with PR #1 (merged):** README.md only, non-conflicting hunks (PR #1 added project tracks table, PR #3 adds current-state ground truth paragraph in different section).

---

### Scope Summary

✓ **PASS** — Clean vertical slice:
- No fixture framework or generic loader
- No reasoner or inference code
- No new matters or events beyond requirements
- No conflicting evidence scenarios
- Merges cleanly into main

---

## Must-Fix Before Merge

**None.** All 4 must-fix issues from PR #2 have been addressed:

1. ✓ **Fixed:** Commit separation (all UI wording in a857787, no UI in 7e7c829)
2. ✓ **Fixed:** Rachel Morgan as Sep 17 sender (now Alex Thompson, Rachel cc'd)
3. ✓ **Fixed:** Superseding events test can now fail (verified by mutation 2a)
4. ✓ **Fixed:** Drift check compares values (verified by mutation 2b)

---

## Nice-to-Have

### 1. Important-date value consistency (Trivial)

**Issue:** PR #2 used `expectedValue: null` for UNKNOWN state, PR #3 uses `expectedValue: "Unknown"` (string).

**Evidence:**
- PR #2: line 59: `expectedValue: null`
- PR #3: line 59: `expectedValue: "Unknown"`
- Both have `expectedState: "UNKNOWN"`

**Impact:** Minimal. Both represent the same semantic state (UNKNOWN). The drift check and pinned values tests accept the new value.

**Recommendation:** Pick one convention (null or "Unknown" string) and document it in the type definition. Either is acceptable, but consistency helps.

---

### 2. Document Alex Thompson persona choice (Low)

**Issue:** PR #3 introduces "Alex Thompson" as a new synthetic attorney name, avoiding the PR #2 issue of mixing interview persona (David Chen from docs/discovery/003) with synthetic data.

**Recommendation:** Add a brief comment in data/synthetic-matter.ts explaining the choice:
```typescript
// Alex Thompson is a fictional attorney name created for synthetic test data.
// It does not appear in discovery interviews (docs/discovery/) to avoid
// conflating interview personas with test fixtures.
```

**Benefit:** Future maintainers understand the naming convention.

---

### 3. Test pinned values independently of predefined brief (Optional)

**Current state:** Test 26 ("current-state expectations pin all 7 conclusion values") hardcodes expected values in the test file and asserts them against the fixture.

**Alternative:** The test could also assert that `syntheticMatterBrief.claims[i].value` matches the pinned values, creating a three-way check (predefined brief ↔ fixture ↔ pinned values test).

**Benefit:** Catches drift in either direction (brief drifting from fixture, or fixture drifting from test).

**Current coverage:** Test 25 (drift check) already does this by comparing brief → fixture. Test 26 pins fixture → test expectations. The three-way check would be redundant but provides extra defense.

**Recommendation:** Current coverage is sufficient. Only add three-way check if drift concerns increase.

---

## Appendix: Command Log

```bash
# Setup
git fetch origin cursor/current-state-ground-truth-v2-7931
git checkout cursor/current-state-ground-truth-v2-7931
git log --oneline origin/main..HEAD  # 4 commits

# Commit analysis
git show --stat 578bb0e  # attorney
git show --stat a857787  # UI wording
git show --stat 7e7c829  # excerpts
git show --stat 7fbf649  # fixture

# Checks
npm install  # 375 packages
npx eslint .  # PASS
npx tsc --noEmit  # PASS
npm test  # 27/27 PASS
npm run build  # PASS

# Mutation 2a: Swap timestamps (evidence items, not event occurredAt)
# Edit data/synthetic-matter.ts lines 103, 119 (swap Sep 12 ↔ Sep 16)
npm test | grep "not ok 21"  # not ok 21 - superseding events (FAIL as expected)
git checkout data/synthetic-matter.ts  # revert

# Mutation 2b: Change fixture value
# Edit data/synthetic-current-state.ts line 10 (value → "Settlement is finalized.")
npm test | grep "not ok 25\|not ok 26"  # both FAIL (as expected)
git checkout data/synthetic-current-state.ts  # revert

# Mutation 2c: Change evidence state
# Edit data/synthetic-current-state.ts line 40 (INFERRED → SUPPORTED)
npm test | grep "not ok 25\|not ok 26"  # both FAIL (as expected)
git checkout data/synthetic-current-state.ts  # revert

# Mutation 2d: Bad excerpt
# Edit data/synthetic-matter.ts line 272 (excerpt → non-substring)
npm test | grep "excerpt"  # Error: excerpt not a substring (FAIL as expected)
git checkout data/synthetic-matter.ts  # revert

# Attorney checks
rg -i "alex thompson" --type ts --type md | wc -l  # 17 references
rg -i "alex thompson" docs/  # 0 results (no collision)
rg "responsibleAttorney.*Rachel" data/ tests/  # 0 results
cat data/synthetic-matter.ts | sed -n '131,145p'  # Sep 17 email: from Alex, cc Rachel

# Fixture comparison
git fetch origin cursor/current-state-ground-truth-328e
git show origin/cursor/current-state-ground-truth-328e:data/synthetic-current-state.ts | head -80
git diff origin/cursor/current-state-ground-truth-328e:data/synthetic-current-state.ts data/synthetic-current-state.ts
# Diff: owner David Chen → Alex Thompson, important-date null → "Unknown"

# Scope checks
rg "reasoner|infer.*engine|generic.*loader|fixture.*framework" --type ts lib/ components/  # 0 results

# Merge test
git merge-base HEAD origin/main  # 00ec179
git checkout -b temp-merge-test origin/main
git merge --no-commit --no-ff cursor/current-state-ground-truth-v2-7931  # clean merge
git checkout cursor/current-state-ground-truth-v2-7931

# Cleanup
git status  # clean
```

---

## Summary

**Overall assessment:** PR #3 successfully addresses all 4 must-fix issues from PR #2:

1. ✓ Commit separation: Clean scope per commit (UI wording fully separated from excerpts)
2. ✓ Rachel Morgan fix: Alex Thompson is now responsible attorney, Rachel cc'd on Sep 17 email
3. ✓ Test bug (superseding): Test now fails correctly when timestamps violate time order
4. ✓ Test bug (drift check): Test now compares values, not just IDs

**Test quality:** All 4 mutation tests confirm fixes work:
- Timestamp swap → superseding test fails ✓
- Value change → drift check + pinned values fail ✓
- State change → drift check + pinned values fail ✓
- Bad excerpt → extraction fails ✓

**Fixture correctness:** Identical to PR #2 except owner = "Alex Thompson" (expected change).

**Scope:** Clean vertical slice with no generalized framework, no reasoner, no new conflicts.

---

## Git Status and Branch State

**Git status:**
```bash
git status
# On branch cursor/current-state-ground-truth-v2-7931
# Your branch is up to date with 'origin/cursor/current-state-ground-truth-v2-7931'.
# nothing to commit, working tree clean
```

✓ Clean — No uncommitted changes, no scratch files remaining.

**Branch state:**
- ✓ No branch was pushed during this review
- ✓ All scratch test files deleted (tests/_eligibility_check.test.ts removed)
- ✓ All mutations reverted
- ✓ Working tree clean

---

**END OF REPORT**

---

## Dial-Tone reviewer notes (2026-10-02, 1:55 PM MT)

- Ran this read-only with a cloud agent on its own VM. Nothing was cloned locally.
- After the run I checked GitHub. PR #3's head is still 7fbf649, no new PRs or branches showed up (the repo has only #1, #2 and #3), and the agent left a clean `git status`. The "+1470/-37 across 21 files" stat is just the PR #3 branch diff against main. It isn't new work.
- Evidence eligibility was computed with the repo's real `buildEligibleEvidenceSet` on main and on PR #3. The outputs are byte-identical: 6 eligible items for matter-2026-0142 and 2 for matter-2026-0159.
- Item 5 note for Drew: important-date went from null to the string "Unknown". The UNKNOWN state is unchanged. If "same as PR #2 except owner" is meant strictly, the builder should revert it to null. Otherwise accept it and document the convention.
- The report recommends nothing about merging. That decision belongs to Drew and Duke.

---

## Round 2: commits 5c0b108 + f3e0f5a

**Commits:** 5c0b108 (fix: important-date expected value is null), f3e0f5a (test: drift check maps null to fixed Unknown display text)  
**Date:** 2026-10-02  
**Reviewer:** Cloud Agent (read-only review)

---

### 1. History Check

**Command:**
```bash
git log --oneline main..HEAD
```

**Result:**
```
f3e0f5a test: drift check maps null to fixed Unknown display text
5c0b108 fix: important-date expected value is null, mapped in drift check
7fbf649 feat: current-state ground truth for Smith v. Acme
7e7c829 fix: evidenceExcerpt now holds true excerpts
a857787 fix: UI wording for predefined brief
578bb0e fix: synthetic responsible attorney
```

**Verification:**
- ✓ Six commits in correct order
- ✓ First four SHAs (578bb0e, a857787, 7e7c829, 7fbf649) unchanged from Round 1
- ✓ Two new commits (5c0b108, f3e0f5a) on top
- ✓ No amend or force-push detected

**Ancestor check:**
```bash
git merge-base --is-ancestor 7fbf649 HEAD
# ✓ 7fbf649 is ancestor of HEAD
```

**Commit 5c0b108 (fix: important-date expected value is null):**

Files changed:
- data/synthetic-current-state.ts (2 lines): `expectedValue: "Unknown"` → `null`
- tests/current-state-ground-truth.test.ts (11 lines): Updated drift check to map UNKNOWN+null → claim.value, updated pinned values test to expect `null`

<details>
<summary>Full diff of 5c0b108</summary>

```diff
diff --git a/data/synthetic-current-state.ts b/data/synthetic-current-state.ts
index 1c5e3e1..249350e 100644
--- a/data/synthetic-current-state.ts
+++ b/data/synthetic-current-state.ts
@@ -56,7 +56,7 @@ export const syntheticCurrentStateGroundTruth: CurrentStateGroundTruth = {
     {
       slotId: "important-date",
       expectedState: "UNKNOWN",
-      expectedValue: "Unknown",
+      expectedValue: null,
       supportingEventIds: [],
       supersededEventIds: [],
       rationale:
diff --git a/tests/current-state-ground-truth.test.ts b/tests/current-state-ground-truth.test.ts
index 8faed93..3ab7f1d 100644
--- a/tests/current-state-ground-truth.test.ts
+++ b/tests/current-state-ground-truth.test.ts
@@ -215,9 +215,16 @@ test("predefined brief claims match ground-truth expectations (drift check)", ()
       `Claim ${claim.id} state matches ground truth`,
     );
 
+    // For UNKNOWN state with null expectedValue, the brief shows display text
+    // (e.g. "Unknown"). Map null (data) to the brief's actual display value.
+    const expectedClaimValue =
+      expectation.expectedState === "UNKNOWN" && expectation.expectedValue === null
+        ? claim.value
+        : expectation.expectedValue;
+
     assert.equal(
       claim.value,
-      expectation.expectedValue,
+      expectedClaimValue,
       `Claim ${claim.id} value matches ground truth`,
     );
 
@@ -245,7 +252,7 @@ test("current-state expectations pin all 7 conclusion values", () => {
     "waiting-on": "Client approval",
     "next-action": "Respond to opposing counsel after the client makes a decision.",
     owner: "Alex Thompson",
-    "important-date": "Unknown",
+    "important-date": null,
     "significant-information":
       "Opposing counsel supplied revised settlement language on September 16, 2026.",
   };
```
</details>

✓ **PASS** — Only touches fixture value and drift check test code as expected.

**Commit f3e0f5a (test: drift check maps null to fixed Unknown display text):**

Files changed:
- tests/current-state-ground-truth.test.ts (9 lines): Changed UNKNOWN+null mapping from `claim.value` (self-comparison) to fixed constant `UNKNOWN_DISPLAY_VALUE = "Unknown"`

<details>
<summary>Full diff of f3e0f5a</summary>

```diff
diff --git a/tests/current-state-ground-truth.test.ts b/tests/current-state-ground-truth.test.ts
index 3ab7f1d..2f86c91 100644
--- a/tests/current-state-ground-truth.test.ts
+++ b/tests/current-state-ground-truth.test.ts
@@ -200,6 +200,9 @@ test("predefined brief claims match ground-truth expectations (drift check)", ()
     ]),
   );
 
+  // Fixed display text for UNKNOWN state with null data value
+  const UNKNOWN_DISPLAY_VALUE = "Unknown";
+
   for (const claim of syntheticMatterBrief.claims) {
     const expectation = groundTruth.expectations.find(
       (exp) => exp.slotId === claim.id,
@@ -215,11 +218,11 @@ test("predefined brief claims match ground-truth expectations (drift check)", ()
       `Claim ${claim.id} state matches ground truth`,
     );
 
-    // For UNKNOWN state with null expectedValue, the brief shows display text
-    // (e.g. "Unknown"). Map null (data) to the brief's actual display value.
+    // For UNKNOWN state with null expectedValue, map to the fixed display text
+    // that the brief should show. This prevents tautological self-comparison.
     const expectedClaimValue =
       expectation.expectedState === "UNKNOWN" && expectation.expectedValue === null
-        ? claim.value
+        ? UNKNOWN_DISPLAY_VALUE
         : expectation.expectedValue;
 
     assert.equal(
```
</details>

✓ **PASS** — Only touches drift check test code as expected.

**Verdict:** ✓ **PASS** — History is correct, both commits touch only their stated scope, no force-push detected.

---

### 2. Standard Checks

**Commands run:**
```bash
npm install                    # 375 packages, 0 vulnerabilities
npx eslint .                   # PASS (no errors)
npx tsc --noEmit               # PASS (no errors)
npx tsx --test tests/all.test.ts  # 27/27 tests PASS
npm run build                  # PASS
```

**Test count:** 27/27 (unchanged from Round 1)

**Build output:**
```
✓ Compiled successfully in 292ms
  Running TypeScript ... Finished TypeScript in 925ms
  Generating static pages (3/3) in 84ms
Route (app): / and /_not-found
```

**Verdict:** ✓ **PASS** — All checks pass. Test count unchanged.

---

### 3. Mutation Tests

All mutations run separately and reverted.

#### Mutation 3a: Set important-date expectedValue back to "Unknown" string

**Mutation:** Changed `data/synthetic-current-state.ts` line 59:
- `expectedValue: null` → `expectedValue: "Unknown"`

**Expected:** Test 26 (pinned values) should **FAIL** (expects null, not "Unknown").

**Result:** ✓ **TEST FAILED**

**Evidence:**
```bash
npx tsx --test tests/all.test.ts | grep "not ok 26"
# not ok 26 - current-state expectations pin all 7 conclusion values
```

**Verdict:** ✓ **PASS** — Pinned values test correctly detects when fixture uses string instead of null.

---

#### Mutation 3b: Set predefined brief important-date value to 'October 15, 2026'

**Mutation:** Changed `data/synthetic-matter.ts` line 335:
- `value: "Unknown"` → `value: "October 15, 2026"`

**Expected:** Test 25 (drift check) should **FAIL** (brief value doesn't match UNKNOWN_DISPLAY_VALUE).

**Result:** ✓ **TEST FAILED**

**Evidence:**
```bash
npx tsx --test tests/all.test.ts | grep "not ok 25"
# not ok 25 - predefined brief claims match ground-truth expectations (drift check)
```

**Explanation:** Drift check compares:
- `claim.value` = "October 15, 2026" (from mutated brief)
- `UNKNOWN_DISPLAY_VALUE` = "Unknown" (fixed constant)
- These don't match, so test fails correctly.

**Verdict:** ✓ **PASS** — Drift check now detects wrong brief values for UNKNOWN+null case.

---

#### Mutation 3c: Swap Sep 12 and Sep 16 evidence item timestamps

**Mutation:** Swapped timestamps in `data/synthetic-matter.ts`:
- `email-0142-waiting-on-counsel` timestamp: 2026-09-12 → 2026-09-16
- `email-0142-revised-language` timestamp: 2026-09-16 → 2026-09-12

**Expected:** Test 21 (supersession ordering) should **FAIL**.

**Result:** ✓ **TEST FAILED**

**Evidence:**
```bash
npx tsx --test tests/all.test.ts | grep "not ok 21"
# not ok 21 - superseding events recorded later than superseded events, same matter
```

**Verdict:** ✓ **PASS** — Supersession test correctly detects timestamp violations (unchanged from Round 1).

---

#### Mutation 3d: Change current-status fixture value to 'Settlement is finalized.'

**Mutation:** Changed `data/synthetic-current-state.ts` line 10:
- `expectedValue: "Settlement revisions are awaiting client approval."` → `"Settlement is finalized."`

**Expected:** Tests 25 (drift check) and 26 (pinned values) should **FAIL**.

**Result:** ✓ **BOTH TESTS FAILED**

**Evidence:**
```bash
npx tsx --test tests/all.test.ts | grep "not ok"
# not ok 25 - predefined brief claims match ground-truth expectations (drift check)
# not ok 26 - current-state expectations pin all 7 conclusion values
```

**Verdict:** ✓ **PASS** — Tests detect value changes correctly (unchanged from Round 1).

---

#### Mutation 3e: Change next-action expectedState from INFERRED to SUPPORTED

**Mutation:** Changed `data/synthetic-current-state.ts` line 40:
- `expectedState: "INFERRED"` → `expectedState: "SUPPORTED"`

**Expected:** Tests 25 (drift check) and 26 (pinned values) should **FAIL**.

**Result:** ✓ **BOTH TESTS FAILED**

**Evidence:**
```bash
npx tsx --test tests/all.test.ts | grep "not ok"
# not ok 25 - predefined brief claims match ground-truth expectations (drift check)
# not ok 26 - current-state expectations pin all 7 conclusion values
```

**Verdict:** ✓ **PASS** — Tests detect state changes correctly (unchanged from Round 1).

---

### 4. Drift Check Code Inspection

**Code location:** tests/current-state-ground-truth.test.ts:203-231

**Key section:**
```typescript
// Fixed display text for UNKNOWN state with null data value
const UNKNOWN_DISPLAY_VALUE = "Unknown";

for (const claim of syntheticMatterBrief.claims) {
  const expectation = groundTruth.expectations.find(
    (exp) => exp.slotId === claim.id,
  );
  
  // ... assertions ...
  
  // For UNKNOWN state with null expectedValue, map to the fixed display text
  // that the brief should show. This prevents tautological self-comparison.
  const expectedClaimValue =
    expectation.expectedState === "UNKNOWN" && expectation.expectedValue === null
      ? UNKNOWN_DISPLAY_VALUE
      : expectation.expectedValue;

  assert.equal(
    claim.value,
    expectedClaimValue,
    `Claim ${claim.id} value matches ground truth`,
  );
}
```

**Analysis:**
- ✓ `UNKNOWN_DISPLAY_VALUE` is a fixed constant: `"Unknown"`
- ✓ When fixture has UNKNOWN+null, `expectedClaimValue` is set to the constant (NOT `claim.value`)
- ✓ Comparison is `claim.value === UNKNOWN_DISPLAY_VALUE` (NOT `claim.value === claim.value`)
- ✓ This prevents tautological self-comparison
- ✓ The brief's actual value is checked against the expected display text

**Proof:** Mutation 3b confirmed this works — when brief's value is changed to "October 15, 2026", the drift check fails because it compares against the fixed "Unknown" constant.

**Verdict:** ✓ **PASS** — No self-comparison. Drift check correctly validates brief's value against fixed constant.

---

### 5. Final Git Status

**Command:**
```bash
git status
```

**Result:**
```
On branch cursor/current-state-ground-truth-v2-7931
Your branch is up to date with 'origin/cursor/current-state-ground-truth-v2-7931'.

nothing to commit, working tree clean
```

**Verification:**
- ✓ No uncommitted changes
- ✓ No staged changes
- ✓ All mutations reverted
- ✓ No scratch files remaining
- ✓ Working tree clean

**Verdict:** ✓ **PASS** — Clean git status.

---

### Round 2 Summary Table

| Check | Verdict | Key Findings |
|-------|---------|--------------|
| 1. History | **PASS** | Six commits in correct order (578bb0e, a857787, 7e7c829, 7fbf649, 5c0b108, f3e0f5a). First four SHAs unchanged. 7fbf649 is ancestor. Both new commits touch only their stated scope. |
| 2. Standard checks | **PASS** | Lint, typecheck, 27/27 tests, build all pass. Test count unchanged from Round 1. |
| 3. Mutation 3a | **PASS** | Setting expectedValue to "Unknown" string → pinned values test fails correctly. |
| 3. Mutation 3b | **PASS** | Changing brief value to "October 15, 2026" → drift check fails correctly. Proves no self-comparison. |
| 3. Mutation 3c | **PASS** | Swapping Sep 12/16 timestamps → supersession test fails correctly (unchanged from Round 1). |
| 3. Mutation 3d | **PASS** | Changing current-status value → both drift check and pinned values tests fail correctly. |
| 3. Mutation 3e | **PASS** | Changing next-action state to SUPPORTED → both tests fail correctly. |
| 4. Drift check code | **PASS** | Uses fixed constant `UNKNOWN_DISPLAY_VALUE = "Unknown"`, not self-comparison. Compares `claim.value` against constant when UNKNOWN+null. Verified by mutation 3b. |
| 5. Git status | **PASS** | Working tree clean, all mutations reverted, no scratch files. |

---

### Overall Assessment (Round 2)

**Summary:** Commits 5c0b108 and f3e0f5a successfully fix the Round 1 nice-to-have item #1 (important-date value consistency) and eliminate the tautological self-comparison flaw in the drift check.

**Changes:**
1. **5c0b108:** Reverted important-date `expectedValue` from `"Unknown"` (string) back to `null`, maintaining UNKNOWN state. Updated drift check to map UNKNOWN+null → `claim.value` (temporary solution allowing brief's display text to pass), and updated pinned values test to expect `null`.

2. **f3e0f5a:** Fixed the tautological self-comparison introduced by 5c0b108 by changing the drift check to map UNKNOWN+null → fixed constant `UNKNOWN_DISPLAY_VALUE = "Unknown"` instead of `claim.value`.

**Result:**
- ✓ Fixture now uses `null` for UNKNOWN data values (consistent with PR #2)
- ✓ Drift check validates that brief displays "Unknown" (not any arbitrary value)
- ✓ No self-comparison: `claim.value` is compared to the fixed constant, not to itself
- ✓ All 5 mutations behave correctly
- ✓ All standard checks pass (27/27 tests)

**Fixes from Round 1:**
- ✓ Nice-to-have #1: important-date consistency (null vs "Unknown" string) — now uses `null`
- ✓ Eliminates the self-comparison flaw that would have allowed wrong brief values to pass

**Evidence quality:** All mutations properly test the fixes and correctly fail when expected.

---

**END OF REPORT**

### Dial-Tone Round 2 notes (2026-10-02, 4:05 PM MT)
- I checked commit parents on GitHub and the history is linear: 578bb0e, a857787, 7e7c829, 7fbf649, 5c0b108, f3e0f5a. The first four SHAs are unchanged from Round 1, so nothing was amended or force-pushed.
- The two new commits touch only `data/synthetic-current-state.ts` (5c0b108) and `tests/current-state-ground-truth.test.ts` (both commits). No other files changed.
- Note: on its own, 5c0b108 still has the self-comparison (UNKNOWN + null mapped to `claim.value`). f3e0f5a fixes it, so HEAD is correct. Squashing or reverting just f3e0f5a would bring the gap back.
- I make no recommendation on merging.
