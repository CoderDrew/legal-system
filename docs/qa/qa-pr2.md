# QA Report: PR #2 — Smith v. Acme Ground Truth + Three Cleanups

**PR:** [#2](https://github.com/CoderDrew/legal-system/pull/2)  
**Branch:** `cursor/current-state-ground-truth-328e` (draft)  
**Base:** `main` (now at 00ec179 after PR #1 merge)  
**Commits:** feb94bc, e18a39a, 24d3d61, 8d8cd2b (4 commits, 4 files → 17 files changed)  
**Tests:** 17 (base) → 26 (branch), all passing  
**Checks:** lint ✓, typecheck ✓, test ✓, build ✓  
**Reviewer:** Cloud Agent (read-only review)  
**Date:** 2026-10-02

---

## Summary Table

| Item | Verdict | Key Issues |
|------|---------|------------|
| 1. Commit separation | **FAIL** | Commit 24d3d61 contains UI wording changes that don't belong in an evidenceExcerpt commit |
| 2. Checks (lint/typecheck/test/build) | **PASS** | All pass. Base: 17 tests, Branch: 26 tests (+9). PR CI unavailable. |
| 3. Fixture correctness | **PASS** | All 7 fields verified against event data. One spec discrepancy noted (deadline field) but acceptable. |
| 4. Rachel Morgan residue | **FAIL** | Sep 17 approval email still from Rachel (Director of Legal Ops), not David Chen (attorney). Actor field incoherence. |
| 5. UI wording | **PASS-WITH-NOTES** | Changes accurate. Button/badge/empty-state now say "predefined" not "generated". But split across 2 commits (scope creep in 24d3d61). |
| 6. evidenceExcerpt | **PASS-WITH-NOTES** | Excerpts are real substrings, verified, meaningful lengths. Commit 24d3d61 claims "no UI changes" but changed mattermind-app.tsx. Final HEAD refactored types cleanly (OperationalEventGroundTruthEntry). |
| 7. Tests | **FAIL** | Two tests have bugs: (a) superseding-events test can never fail (assert.ok(true) inside if); (b) drift check doesn't compare values, only IDs. Demonstrated with local mutations. |
| 8. Conflict with PR #1 | **PASS** | Merges cleanly. README.md changes non-overlapping (PR #1 added table, PR #2 added paragraph, both merged without conflict). Branch is behind main by 1 commit (00ec179). |

---

## Detailed Findings

### 1. Commit Separation

**Command:**
```bash
git log --oneline 5c9015c..HEAD
# 8d8cd2b feat: current-state ground truth for Smith v. Acme
# 24d3d61 fix: evidenceExcerpt now holds true excerpts
# e18a39a fix: UI wording for predefined brief
# feb94bc fix: synthetic responsible attorney
```

**Per-commit analysis:**

#### feb94bc: fix: synthetic responsible attorney
```
Files: data/synthetic-matter.ts (12 changes), tests/operational-events.test.ts (6 changes)
Scope: Replaced Rachel Morgan → David Chen as responsibleAttorney in both matters.
       Updated test expectations for actor field.
```
✓ **PASS** — Only responsible attorney changes, no scope creep.

#### e18a39a: fix: UI wording for predefined brief
```
Files: components/status-brief.tsx (1 line)
Change: "Read-only reconstruction" → "Predefined synthetic output" (header badge)
```
✓ **PASS** — Only the header badge, as stated.

#### 24d3d61: fix: evidenceExcerpt now holds true excerpts
```
Files: components/mattermind-app.tsx (14 changes), data/synthetic-matter.ts (9 additions),
       lib/operational-events.ts (12 additions), tests/operational-events.test.ts (42 changes),
       types/mattermind.ts (1 addition)
Changes:
  - Added evidenceExcerpt field to OperationalEventDraft type ✓
  - Updated ground truth with hand-picked excerpts ✓
  - Modified extraction to verify excerpts are substrings ✓
  - Added test for excerpt verification ✓
  - ALSO changed mattermind-app.tsx UI wording (button + empty state text) ✗
```
**FAIL** — Commit message says "No architecture or UI component changes" but includes substantial UI wording changes:
- Button: "Generate Status Brief" → "Show Sample Status Brief"
- Empty state heading: "No status brief generated" → "No status brief shown"  
- Empty state text: "MatterMind reconstructs..." → "This increment displays a predefined synthetic status brief..."

**Evidence:**
```bash
git show 24d3d61 components/mattermind-app.tsx
# Shows 14-line diff with button and empty-state wording changes
```

These UI changes overlap with commit e18a39a's intent ("UI wording for predefined brief"). The wording changes should have been in e18a39a or a separate commit, not bundled with evidenceExcerpt implementation.

#### 8d8cd2b: feat: current-state ground truth for Smith v. Acme
```
Files: README.md (+2), components/mattermind-app.tsx (1 line),
       data/synthetic-current-state.ts (+76 new file),
       docs/architecture/mattermind-v1-architecture.md (+2),
       tests/all.test.ts (+2), tests/current-state-ground-truth.test.ts (+238 new file),
       tests/operational-events.test.ts (+2), types/mattermind.ts (+20)
Changes:
  - New CurrentStateExpectation + CurrentStateGroundTruth types ✓
  - New fixture file with 7 expectations ✓
  - New test file with 8 tests ✓
  - Refactored OperationalEventDraft → OperationalEventGroundTruthEntry to isolate evidenceExcerpt ✓
  - README and architecture checkpoint updates ✓
```
✓ **PASS** — All changes support the ground-truth fixture. The type refactoring (extracting evidenceExcerpt to OperationalEventGroundTruthEntry) is a cleanup from 24d3d61.

**No generalized framework:** ✓ No generic loader, no reasoner code detected (grep for "reasoner", "infer", "loader" yielded only test/fixture references).

---

### 2. Checks

**Commands run:**
```bash
npm ci           # ✓ Success (376 packages, 0 vulnerabilities)
npm run lint     # ✓ Success (no output)
npm run typecheck # ✓ Success (no errors)
npm test         # ✓ Success (26/26 pass)
npm run build    # ✓ Success (built in 6.1s, 3 routes)
```

**Test counts:**
- Base (main @ 00ec179): 17 tests, all pass
- Branch (HEAD @ 8d8cd2b): 26 tests, all pass  
- **Delta:** +9 tests
  - 8 from tests/current-state-ground-truth.test.ts
  - 1 from tests/operational-events.test.ts ("evidence excerpts are verbatim substrings")

**Test files:**
- Base: 2 files (operational-events.test.ts, all.test.ts entrypoint)
- Branch: 3 files (+current-state-ground-truth.test.ts)

**PR CI status:**
```bash
gh pr checks 2
# no checks reported on the 'cursor/current-state-ground-truth-328e' branch
```
PR CI checks unavailable (branch not yet pushed to trigger CI or no CI configured).

---

### 3. Fixture Correctness

**Source:** `data/synthetic-current-state.ts` (7 expectations for matter-2026-0142, asOf: 2026-09-17T23:59:59Z)

**7 Events (from `data/synthetic-matter.ts` ground truth):**
1. `email-0142-scheduling:schedule-status-reported` (Sep 10) — schedule status
2. `email-0142-waiting-on-counsel:waiting-state-reported` (Sep 12) — waiting state
3. `email-0142-revised-language:document-sent` (Sep 16) — document sent by opposing counsel
4. `clio-matter-0142:matter-status-recorded` (Sep 17 09:00) — Active status
5. `clio-matter-0142:responsibility-recorded` (Sep 17 09:00) — David Chen responsible
6. `email-0142-client-approval:document-reviewed` (Sep 17 17:45, null occurredAt) — Rachel reviewed
7. `email-0142-client-approval:approval-requested` (Sep 17 17:45) — Rachel requested approval

**Fixture verification:**

| Slot | Fixture Value | Label | Supporting Events | Superseded Events | Matches Data? | Notes |
|------|--------------|-------|-------------------|-------------------|---------------|-------|
| **current-status** | "Settlement revisions are awaiting client approval." | SUPPORTED | [3, 7] | [2] | ✓ | Sep 12 waiting-on-counsel superseded by Sep 16 document-sent + Sep 17 approval-requested. Correct. |
| **last-important-event** | "September 17, 2026 — Attorney requested client approval..." | SUPPORTED | [7] | [] | ✓ | Latest substantive event is approval-requested (Sep 17 17:45). Correct. |
| **waiting-on** | "Client approval" | SUPPORTED | [7] | [] | ✓ | Approval requested Sep 17, not yet received as of cutoff. Correct. |
| **next-action** | "Respond to opposing counsel after the client makes a decision." | INFERRED | [7] | [] | ✓ | Logical inference from pending approval. Correct use of INFERRED. |
| **owner** | "David Chen" | SUPPORTED | [5] | [] | ✓ | Clio responsibility-recorded event (Sep 17 09:00). Correct. |
| **important-date** | null | UNKNOWN | [] | [] | ✓ | Sep 10 email says "next month" (relative, not a date). Correct use of UNKNOWN. Spec says deadline should be UNKNOWN. |
| **significant-information** | "Opposing counsel supplied revised settlement language on September 16, 2026." | SUPPORTED | [3] | [] | ✓ | Document-sent event from opposing counsel (Sep 16). Correct. |

**Status check (per spec):**
- **Current status:** Spec expects "awaiting client approval" with Sep 12 superseded by Sep 16. ✓ Fixture has this.
- **Last important event:** Spec says Sep 17 approval-requested. ✓ Fixture has this.
- **Waiting on:** Spec expects "client approval" (SUPPORTED). ✓ Fixture has this.
- **Next action:** Spec expects "respond to opposing counsel after client decides" (INFERRED). ✓ Fixture has this.
- **Owner:** Spec expects David Chen from responsibility-recorded. ✓ Fixture has this.
- **Deadline:** Spec says UNKNOWN ("next month" is relative). ✓ Fixture has null with UNKNOWN.
- **Significant info:** Spec expects Sep 16 revised language (SUPPORTED). ✓ Fixture has this.

**Result:** ✓ **PASS** — All 7 expectations match event data and spec. No discrepancies.

**Event IDs referenced:**
- All 7 events referenced, no dangling IDs
- Superseded event (email-0142-waiting-on-counsel:waiting-state-reported) correctly marked as superseded but still present in extraction output (verified by test "superseded events remain present in extraction output")

---

### 4. Rachel Morgan Residue

**grep for 'Rachel' or 'Morgan' in branch:**
```bash
rg -i "rachel|morgan" data/ tests/ components/ --type ts
# 64 total matches across discovery docs, data, tests
```

**Key references in code (data/synthetic-matter.ts):**

1. **As requesting user (CORRECT):**
   - `syntheticRequestingUser` = { id: "user-rachel-morgan", name: "Rachel Morgan", ... } — line 38-42
   - Authorized for both matters, appears in participants, authorizedUserIds throughout
   - **Discovery context:** docs/discovery/001-rachel-morgan.md identifies her as "Director of Legal Operations"

2. **As email sender/actor (PROBLEMATIC):**
   - **Sep 10 scheduling email:** from "rachel.morgan@lawfirm.example" (line 74) — ✓ OK for scheduling
   - **Sep 12 waiting-on-counsel email:** from "rachel.morgan@lawfirm.example" (line 104), actor: "Rachel Morgan" (line 222) — ✓ OK for status update
   - **Sep 17 approval email:** from "rachel.morgan@lawfirm.example" (line 136), actor: "Rachel Morgan" (lines 271, 281) — **✗ INCOHERENT**

**Sep 17 approval email content (data/synthetic-matter.ts:139-140):**
```typescript
content:
  "Jordan, opposing counsel sent revised settlement language yesterday. I reviewed 
   the changes and would like your approval before I respond. Please let me know 
   whether you are comfortable accepting these revisions.",
```

**Analysis:**
- "I reviewed the changes" — legal review of settlement language
- "would like your approval before I respond" — planning to respond to opposing counsel
- This is **attorney work**, not Director of Legal Operations work

**Responsible attorney per commit feb94bc:**
- Matter responsibleAttorney: "David Chen" (line 15)
- Clio event actor for responsibility-recorded: David Chen (line 260)

**The incoherence:**
Rachel Morgan (Director of Legal Ops per docs/discovery/001) is:
1. Reviewing revised settlement language (attorney task)
2. Seeking client approval before responding to opposing counsel (attorney task)
3. But she is NOT the responsible attorney (David Chen is)

**Is this a problem with the fixture?**
- Fixture `owner` field correctly cites David Chen from the Clio responsibility-recorded event (fixture line 49-54)
- Fixture does NOT use the Sep 17 approval email's actor field for the owner expectation
- However, the fixture DOES cite the Sep 17 approval-requested event for `waiting-on`, `next-action`, and `last-important-event` (fixture lines 23-24, 33, 42)

**Should feb94bc have fixed this?**
Yes. The commit message says "Replace her [Rachel] with David Chen as the responsible attorney" and "Updated all consistent references". But the Sep 17 approval email content and actor field were NOT updated. The email should be from David Chen, not Rachel Morgan, since it's performing attorney duties.

**Impact:**
- Medium: The fixture's conclusions about waiting-on and next-action are still correct (client approval is needed, response required), but the supporting event has an incorrect actor
- The ground truth now has an internally inconsistent synthetic dataset (Director of Legal Ops doing attorney work)

---

### 5. UI Wording

**Old vs. New:**

| Location | Old | New | File:Line | Accurate? |
|----------|-----|-----|-----------|-----------|
| **Button (not clicked)** | "Generate Status Brief" | "Show Sample Status Brief" | mattermind-app.tsx:126 | ✓ Yes, brief is predefined |
| **Button (clicked)** | "Status Brief Generated" | "Sample Brief Shown" | mattermind-app.tsx:121 | ✓ Yes, shown not generated |
| **Empty state heading** | "No status brief generated" | "No status brief shown" | mattermind-app.tsx:150 | ✓ Yes, consistent with button |
| **Empty state body** | "MatterMind reconstructs the current operational state of the selected matter from authorized evidence. Generate the brief to review claims, evidence states, and source provenance." | "This increment displays a predefined synthetic status brief for demonstration purposes. The brief is not generated from events. Show the brief to review claims, evidence states, and source provenance." | mattermind-app.tsx:153-155 | ✓ Yes, accurate |
| **Header badge** | "Read-only reconstruction" | "Predefined synthetic output" | status-brief.tsx:51 | ✓ Yes, no reconstruction happening |

**UI component logic check:**
```typescript
const [isGenerated, setIsGenerated] = useState(false);
// ...
onClick={() => setIsGenerated(true)}
// ...
{isGenerated ? <StatusBrief ... /> : <empty state>}
```
The button toggles a state variable that shows/hides a **predefined brief**. No generation, reconstruction, or API call. The new wording is accurate.

**Issue:** UI wording changes split across 2 commits:
- e18a39a: only status-brief.tsx (header badge)
- 24d3d61: mattermind-app.tsx (button + empty state) — **this is scope creep** (see item 1)

---

### 6. evidenceExcerpt

**Changes in commit 24d3d61:**

1. **Type change (types/mattermind.ts):**
   - Commit 24d3d61: Added `evidenceExcerpt: string` to `OperationalEventDraft`
   - Commit 8d8cd2b: Refactored to `OperationalEventGroundTruthEntry = OperationalEventDraft & { evidenceExcerpt: string }`
   - Final state: evidenceExcerpt only in ground truth entry type, not in base OperationalEventDraft
   - **Exported types:** Base had 19 exports, commit 24d3d61 had 19, HEAD has 21 (+CurrentStateExpectation, +CurrentStateGroundTruthEntry)
   - **Architecture impact:** Minimal. Type refactoring in 8d8cd2b isolated the excerpt to ground truth only. OperationalEvent still has excerpt in provenance.

2. **Ground truth update (data/synthetic-matter.ts):**
   - Added `evidenceExcerpt` field to all 7 event ground truth entries (9 additions total, including email-0159 events)
   - Example excerpts:
     - "The settlement conference remains scheduled for next month." (62 chars)
     - "waiting for opposing counsel to send the revised settlement language" (69 chars)
     - "I reviewed the changes" (22 chars)
     - "would like your approval before I respond" (42 chars)
     - "Matter status: Active" (21 chars)
     - "Responsible attorney: David Chen" (33 chars)

3. **Extraction verification (lib/operational-events.ts:25-29):**
   ```typescript
   if (!evidence.content.includes(event.evidenceExcerpt)) {
     throw new Error(
       `Evidence excerpt for event ${event.eventId} is not a substring ...`,
     );
   }
   ```
   Runtime verification that every excerpt is a verbatim substring of the source artifact content.

4. **Test (tests/operational-events.test.ts:251-269):**
   ```typescript
   test("evidence excerpts are verbatim substrings shorter than artifact content", () => {
     for (const event of events) {
       assert.ok(artifact.content.includes(event.provenance.evidenceExcerpt), ...);
       assert.ok(event.provenance.evidenceExcerpt.length < artifact.content.length, ...);
     }
   });
   ```
   Verifies every excerpt is (1) a substring and (2) shorter than full content.

**Are excerpts meaningful (not trivially short)?**
- Shortest: "I reviewed the changes" (22 chars) — ✓ meaningful
- Typical: 21-69 chars — ✓ meaningful spans
- All excerpts are complete phrases or clauses, not single words

**UI/schema/contract changes:**
- **UI:** No UI component reads evidenceExcerpt directly. It's in OperationalEvent.provenance, which StatusBrief receives but doesn't render. Badge says "synthetic output", no evidence rendering yet.
- **Schema:** No database schema (synthetic data only)
- **Contracts:** OperationalEvent type is exported. Its `provenance` object now has `evidenceExcerpt: string`. This is a **contract change** (callers of extractOperationalEvents now get excerpts in provenance). However, this is **internal to the boundary** (no external API, no production integrations yet).
- **Commit 24d3d61 claim:** "No architecture or UI component changes" — **INACCURATE**. While no UI rendering changed, the commit DOES change UI wording in mattermind-app.tsx (see item 5).

**Minimum needed?**
- Type: OperationalEventGroundTruthEntry (added in 8d8cd2b) — ✓ minimum, isolates excerpt to ground truth
- Verification: substring check in extraction — ✓ minimum, prevents bad data
- Test: excerpt verification — ✓ minimum, regression protection

**Scope beyond slice?**
- No generalized excerpt framework (no AI extraction, no excerpt API)
- No UI changes for rendering excerpts (brief still shows artifact IDs, not excerpt text)
- ✓ **Within slice:** hand-specified excerpts for 7 events, verified at extraction

---

### 7. Tests

**Test structure:**
- tests/all.test.ts: entrypoint that imports operational-events.test.ts and current-state-ground-truth.test.ts
- Tests pin expectations against raw event data (operational-events.test.ts) and fixture (current-state-ground-truth.test.ts)

#### Issue 7a: Superseding events test can never fail

**Test:** `tests/current-state-ground-truth.test.ts:104-144` — "superseding events recorded later than superseded events, same matter"

**Code:**
```typescript
for (const expectation of groundTruth.expectations) {
  for (const supersededId of expectation.supersededEventIds) {
    const supersededEvent = eventMap.get(supersededId);
    assert.ok(supersededEvent, ...); // ✓ checks event exists
    assert.equal(supersededEvent.matterId, groundTruth.matterId, ...); // ✓ checks same matter

    for (const supportingId of expectation.supportingEventIds) {
      const supersedingEvent = eventMap.get(supportingId);
      if (!supersedingEvent) continue; // skip if event not found

      const supersededTime = new Date(supersededEvent.provenance.sourceRecordedAt).getTime();
      const supersedingTime = new Date(supersedingEvent.provenance.sourceRecordedAt).getTime();

      if (supersedingTime > supersededTime) {
        assert.ok(true, `Superseding event ${supportingId} recorded after ...`); // ← BUG
      }
      // No else clause! If condition is false, nothing happens.
    }
  }
}
```

**The bug:** Line 136 only runs `assert.ok(true, ...)` **inside** the if block when the time comparison is true. If the superseding event is EARLIER (violating the invariant), the if block is skipped and no assertion fails.

**Demonstration:**
```bash
# Mutated data: swapped timestamps so superseding event (document-sent) is Sep 12, 
# superseded event (waiting-state-reported) is Sep 16.
# Expected: test should FAIL (superseding is earlier than superseded)
# Actual: test PASSES

npm test 2>&1 | grep "superseding events recorded later"
# ok 4 - superseding events recorded later than superseded events, same matter
```

**Evidence:** Mutated `data/synthetic-matter.ts` to make `email-0142-revised-language:document-sent` occur at 2026-09-12 (4 days BEFORE the superseded event at 2026-09-16), test still passed.

**Fix needed:** Replace `if (supersedingTime > supersededTime) { assert.ok(true, ...) }` with `assert.ok(supersedingTime > supersededTime, ...)` outside the if block.

#### Issue 7b: Drift check doesn't compare values

**Test:** `tests/current-state-ground-truth.test.ts:202-238` — "predefined brief claims match ground-truth expectations (drift check)"

**Code:**
```typescript
for (const claim of syntheticMatterBrief.claims) {
  const expectation = groundTruth.expectations.find(exp => exp.slotId === claim.id);
  assert.ok(expectation, ...); // ✓ checks expectation exists

  assert.equal(claim.state, expectation.expectedState, ...); // ✓ checks state matches

  const expectedArtifactIds = expectation.supportingEventIds
    .map(eventId => eventToArtifactMap.get(eventId))
    .filter((id): id is string => id !== undefined)
    .sort();
  const actualArtifactIds = [...claim.evidenceIds].sort();

  assert.deepEqual(actualArtifactIds, expectedArtifactIds, ...); // ✓ checks artifact IDs match
  
  // Missing: assert.equal(claim.value, expectation.expectedValue, ...)
}
```

**The bug:** Test compares `claim.state` (SUPPORTED/INFERRED/UNKNOWN) and `claim.evidenceIds` (artifact IDs), but **never compares `claim.value`** (the actual text).

**Demonstration:**
```bash
# Mutated fixture: changed expectedValue from "Settlement revisions are awaiting 
# client approval." to "MUTATED TEST VALUE - Settlement is finalized."
# Expected: drift check should FAIL (value mismatch)
# Actual: test PASSES

npm test 2>&1 | grep "drift check"
# ok 8 - predefined brief claims match ground-truth expectations (drift check)
```

**Evidence:** Changed `data/synthetic-current-state.ts` line 10 `expectedValue` from the correct status to a mutated string, test still passed.

**Impact:** If syntheticMatterBrief.claims[].value drifts from the fixture, the test won't catch it. Only state and artifact IDs are checked.

**Fix needed:** Add `assert.equal(claim.value, expectation.expectedValue, ...)` after the state check.

#### Are tests tautological?

**No.** The tests compare:
- Fixture event IDs against extraction output (not self-comparison)
- Predefined brief claims against fixture expectations (independent data sources)
- Event timestamps and relationships (structural constraints)

Example non-tautological assertions:
```typescript
// Asserts fixture references events that actually exist in extraction output
assert.ok(extractedEventIds.has(eventId), ...);

// Asserts brief claims match fixture (two independent synthetic datasets)
assert.deepEqual(actualArtifactIds, expectedArtifactIds, ...);

// Asserts time ordering
assert.ok(recordedTime <= asOfTime, ...);
```

The tests are **NOT** snapshot tests or self-comparisons. However, test 7a and 7b have logic bugs that prevent them from failing when they should.

---

### 8. Conflict with PR #1

**PR #1 status:** Merged to main as squash commit 00ec179 (Oct 2, 2026, 13:06:34 -0600)

**PR #1 changes:**
```bash
git show --stat 00ec179
# 11 files changed, 1016 insertions(+)
# README.md | 7 +
# docs/discovery/discovery-log.md | 12 +
# docs/discovery/intake-track/* (9 new files)
# docs/discovery/open-questions.md | 8 +
# docs/mvp/mvp-selection.md | 7 +
```

**PR #2 changes (vs. merge base 5c9015c):**
```bash
git diff --name-only 5c9015c..HEAD
# README.md
# components/mattermind-app.tsx
# components/status-brief.tsx
# data/synthetic-current-state.ts (new)
# data/synthetic-matter.ts
# docs/architecture/mattermind-v1-architecture.md
# tests/all.test.ts
# tests/current-state-ground-truth.test.ts (new)
# tests/operational-events.test.ts
# types/mattermind.ts
```

**Overlapping files:** README.md

**README.md changes:**

PR #1 (00ec179):
```diff
+## Project tracks
+
+| Track | Status | Record |
+| --- | --- | --- |
+| Active-matter status brief | **Approved V1.** ... | ... |
+| Prospective-client intake | **Discovery track. Not approved...** | ... |
+
 ## Current phase: MatterMind V1 — Synthetic Vertical Slice
```

PR #2 (8d8cd2b):
```diff
 ## Current phase: MatterMind V1 — Synthetic Vertical Slice
 
 ...
-Current-state ground truth is defined for Smith v. Acme (matter-2026-0142). The fixture specifies expected current-state conclusions for each brief slot, including supersession relationships, supporting event IDs, and judgment rationales. Reasoning to produce those conclusions from events is not yet implemented.
+Current-state ground truth is defined for Smith v. Acme...
 
 The visible Matter Status Brief remains predefined synthetic output...
```

**Test merge:**
```bash
git checkout cursor/current-state-ground-truth-328e
git merge --no-commit --no-ff origin/main
# Auto-merging README.md
# Automatic merge went well; stopped before committing as requested

git diff HEAD origin/main -- README.md
# PR #1 adds lines 9-15 (Project tracks table)
# PR #2 adds lines 57-58 (current-state ground truth paragraph)
# Non-overlapping hunks, merge is clean.
```

**Result:**
- ✓ **Merges cleanly** (no conflicts)
- ✓ README.md changes are in different sections (non-overlapping hunks)
- PR #2 branch is **1 commit behind main** (00ec179 not in branch)

**Branch status:**
```bash
git log --oneline origin/main ^cursor/current-state-ground-truth-328e
# 00ec179 docs: park intake V1 as discovery track; confirm status brief as approved V1 (#1)

git log --oneline cursor/current-state-ground-truth-328e ^origin/main
# 8d8cd2b feat: current-state ground truth for Smith v. Acme
# 24d3d61 fix: evidenceExcerpt now holds true excerpts
# e18a39a fix: UI wording for predefined brief
# feb94bc fix: synthetic responsible attorney
```

---

## Must-Fix Before Merge

### 1. **Commit 24d3d61 scope creep** (High)
**Issue:** Commit 24d3d61 ("fix: evidenceExcerpt now holds true excerpts") includes UI wording changes that don't belong. The commit message says "No architecture or UI component changes" but changes mattermind-app.tsx (button text, empty state text).

**Evidence:** `git show 24d3d61 components/mattermind-app.tsx` — 14 lines changed

**Fix:** Either:
- (a) Amend commit e18a39a to include all UI wording changes (button + empty state + header badge) and rebase 24d3d61 to remove the UI changes, OR
- (b) Accept the commits as-is but update 24d3d61's commit message to acknowledge the UI wording changes, OR
- (c) Split 24d3d61 into two commits: one for evidenceExcerpt, one for UI wording

**Recommendation:** (a) or (c) for clean history.

### 2. **Rachel Morgan as Sep 17 email sender** (High)
**Issue:** The Sep 17 approval email (`email-0142-client-approval`) is from Rachel Morgan (Director of Legal Ops), but the content describes attorney work: "I reviewed the changes and would like your approval before I respond [to opposing counsel]." David Chen is the responsible attorney per commit feb94bc.

**Evidence:**
- `data/synthetic-matter.ts:136` — from: "rachel.morgan@lawfirm.example"
- `data/synthetic-matter.ts:139-140` — content: "I reviewed the changes and would like your approval before I respond."
- `data/synthetic-matter.ts:271, 281` — actor: "Rachel Morgan"
- `docs/discovery/001-rachel-morgan.md` — role: Director of Legal Operations

**Impact:** Fixture's `owner`, `waiting-on`, `next-action`, and `last-important-event` fields cite this event. The conclusions are still correct (client approval is needed), but the supporting evidence has an incoherent actor.

**Fix:** Change email sender and event actor from Rachel Morgan to David Chen. Update content to reflect attorney voice. Commit feb94bc should have made this change but missed it.

**Recommendation:** Amend feb94bc (or add a new commit) to fix the Sep 17 email sender and actor.

### 3. **Test bug: superseding events test can never fail** (Medium)
**Issue:** `tests/current-state-ground-truth.test.ts:104-144` only runs `assert.ok(true, ...)` inside an if block. If the time comparison fails, no assertion runs and the test passes.

**Evidence:** Mutated data to make superseding event EARLIER than superseded event → test still passed

**Fix:** Replace:
```typescript
if (supersedingTime > supersededTime) {
  assert.ok(true, `Superseding event ${supportingId} recorded after ...`);
}
```
with:
```typescript
assert.ok(
  supersedingTime > supersededTime,
  `Superseding event ${supportingId} recorded after superseded event ${supersededId}`
);
```

### 4. **Test bug: drift check doesn't compare values** (Medium)
**Issue:** `tests/current-state-ground-truth.test.ts:202-238` compares `state` and `evidenceIds` but not `value`. If `claim.value` drifts from `expectation.expectedValue`, the test won't catch it.

**Evidence:** Mutated fixture value from "Settlement revisions are awaiting client approval." to "MUTATED TEST VALUE" → test still passed

**Fix:** Add after line 224:
```typescript
assert.equal(
  claim.value,
  expectation.expectedValue,
  `Claim ${claim.id} value matches ground truth`
);
```

---

## Nice-to-Have

### 1. **Rebase onto current main** (Low)
**Issue:** Branch is 1 commit behind main (00ec179).

**Fix:** `git rebase origin/main` before merge to incorporate PR #1 changes.

**Benefit:** Cleaner merge, no "Merge branch 'main' into..." commit.

### 2. **David Chen persona mixing** (Low)
**Issue:** David Chen is an interviewed stakeholder persona (docs/discovery/003-employment-attorney.md — "Employment Attorney") and is now also the responsible attorney in synthetic matter data.

**Evidence:**
- `docs/discovery/003-employment-attorney.md:5` — "David Chen, Employment Attorney"
- `data/synthetic-matter.ts:15, 28` — responsibleAttorney: "David Chen"

**Impact:** Mixing an interview persona into synthetic data may cause confusion (is this the real David Chen or a synthetic character?). Discovery docs are meant to represent real stakeholders, while synthetic data should be fictional.

**View:** This is **mildly problematic**. Best practice would be to use entirely fictional names in synthetic data (e.g., "Alex Johnson, Attorney") to avoid conflating discovery personas with test fixtures. However, given that:
- The entire engagement is fictional (per README.md)
- David Chen is explicitly a "fictional law firm" persona (003:6)
- The alternative (inventing a new attorney) would leave Rachel Morgan as the only named attorney, which is worse (she's not an attorney)

**Recommendation:** Acceptable for now, but consider renaming to a different fictional attorney in future iterations to cleanly separate discovery personas from synthetic test data. Document the choice (e.g., in data/synthetic-matter.ts comments).

### 3. **Test count comment drift** (Trivial)
**Issue:** If test counts are documented elsewhere (e.g., PR description, architecture docs), verify they match the actual 17 → 26 count.

**Fix:** Spot-check PR description and docs for "18 tests" or similar and update if needed.

---

## Appendix: Command Log

```bash
# Setup
git branch --show-current  # cursor/current-state-ground-truth-328e
git fetch origin main
git log --oneline 5c9015c..HEAD  # 4 commits
gh pr view 2 --json baseRefName,commits  # base: main, 4 commits

# Checks
npm ci  # ✓ 376 packages
npm run lint  # ✓ pass
npm run typecheck  # ✓ pass
npm test  # ✓ 26/26 pass
npm run build  # ✓ build successful

# Base branch test count
git checkout origin/main
npm test  # ✓ 17/17 pass
git checkout cursor/current-state-ground-truth-328e

# Commit analysis
git show --stat feb94bc  # 2 files, 9/9 changes (attorney)
git show --stat e18a39a  # 1 file, 1/1 change (UI wording badge)
git show --stat 24d3d61  # 5 files, 57/21 changes (excerpts + UI wording!)
git show --stat 8d8cd2b  # 8 files, 342 insertions (fixture)

# Rachel Morgan search
rg -i "rachel|morgan" data/ tests/ components/ --type ts  # 64 matches
rg "actor.*Rachel Morgan" data/synthetic-matter.ts  # 4 events

# Test mutation experiments
# Experiment 1: Change fixture expectedValue
vim data/synthetic-current-state.ts  # line 10: mutate value
npm test | grep "drift check"  # ✓ still passes (BUG)
git checkout data/synthetic-current-state.ts  # revert

# Experiment 2: Swap event timestamps
vim data/synthetic-matter.ts  # swap Sep 12 ↔ Sep 16
npm test | grep "superseding events"  # ✓ still passes (BUG)
git checkout data/synthetic-matter.ts  # revert

# Merge test
git merge --no-commit --no-ff origin/main  # ✓ clean merge
git diff HEAD origin/main -- README.md  # non-overlapping hunks
git merge --abort

# Cleanup
git status  # clean
```

---

## Summary

**Overall assessment:** PR #2 delivers the promised ground-truth fixture and three cleanups, with all checks passing and fixture data verified. However, **four must-fix issues** block merge:

1. Commit 24d3d61 has scope creep (UI wording mixed with evidenceExcerpt)
2. Sep 17 approval email still from Rachel Morgan (should be David Chen)
3. Superseding-events test can never fail (logic bug)
4. Drift check test doesn't compare values (logic bug)

**Recommendation:** Address must-fix items 1-4, then merge. Nice-to-have items (rebase, persona mixing) can be deferred to follow-up PRs.

**Test quality:** 9 new tests is good coverage, but 2 have logic bugs that prevent them from failing. Fix those bugs to ensure the ground truth contract is actually tested.

**Architecture:** No generalized framework, no reasoner, no scope creep beyond the stated slice (except for the UI wording in 24d3d61). Types are cleanly factored at HEAD (OperationalEventGroundTruthEntry isolates evidenceExcerpt).

---

**END OF REPORT**

---

## Dial-Tone reviewer notes (added after the automated review)

- **Report source:** a read-only cloud agent review of branch `cursor/current-state-ground-truth-328e` against `main` at 00ec179. Nothing was pushed, commented on or approved. PR CI showed no checks for the branch, so the lint, typecheck, test and build results come from local runs only.
- **Item 7, sharpened:** the tests aren't self-comparisons, but they don't pin the conclusions either. They check that the cited event IDs exist, that state labels match, and that the artifact-ID sets match. No test checks a conclusion's *value* (status text, waiting-on, next action, owner, deadline UNKNOWN, significant info) against the raw events or against an independently written expectation. Changing a fixture value while keeping its IDs passed every test (7b), and swapping the supersession timestamps passed too (7a). In effect, the fixture's correctness (item 3 PASS) was established by this review, and the suite does not protect it.
- **Item 4, persona reuse:** `docs/discovery/003-employment-attorney.md` names David Chen as the interviewed employment senior associate. Making him the responsible attorney on a synthetic matter mixes a discovery stakeholder into fabricated case data. A later reader could take synthetic events as things David said or did, and evidence citations could blur interview facts with test data. It's not a blocker, since everything is simulated, but a clearly synthetic name (e.g. "Avery Synthetic, Esq.") is cleaner. If the name stays, the Sep 17 email still needs to move from Rachel to the attorney either way, because her role (Director of Legal Ops, per 001) can't plausibly "respond" to opposing counsel.
- **Merge state:** the branch is 1 commit behind `main` (PR #1 squash 00ec179). A local test merge reported no conflicts; the README edits don't overlap.
