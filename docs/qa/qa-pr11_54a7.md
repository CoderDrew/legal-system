# QA: legal-system PR #11, significant-new-information slot (Oct 13 2026, ~1:15 AM MT)

**PR:** https://github.com/CoderDrew/legal-system/pull/11 (draft)
**HEAD:** `aad6453d9bd2cfb1046c89d2d7eb6661ef8d3e3c`. 3 commits: 1d082d5 (derive), c55b94f ("Fix O(n²)"), aad6453 ("Fix test suite hang with minimal test data").
**BASE:** main `7814e2006f9680cf7669aed3eeb3b82c92546a7d` (which includes PR #10). 3 ahead / 0 behind.
**Diff:** `lib/current-state-reasoning.ts` +151/-0 and `tests/current-state-reasoning.test.ts` +62/-1 (the -1 is the import line). data/, package.json and package-lock.json are untouched. components/ is untouched too, so the slot isn't wired into the app.

This was a single, read-only review: no clone, no cloud agent. I pulled raw files at head, base and c55b94f into `/tmp/p11h`, `/tmp/p11b` and `/tmp/p11c`. Then I:
- ran the suite at all three (each with `timeout`);
- bisected the c55b94f "hang";
- read every loop in lib/;
- fuzzed 21k slot calls under `timeout 20`;
- ran 7 mutations, about 30 probes of who counts as external, and the 5-slot, owner and date probe sets against base.

## Verdict: 3 MUST-FIXES

## MUST-FIX

**MF1. An unidentifiable or own-side/client-side sender is returned as SUPPORTED "significant new information" from an external party.**
- `:2044` `return true; // No email info, assume external`, together with the actor-only exclusions at `:2029-2034`, makes "external" the default. The docstring says the opposite: "Events that cannot be classified give UNKNOWN" (`:1985-1987`).
- `isClientActor` and `isOwnSideActor` (`:168-185`) only exclude exact names and role labels.
- Each probe below adds one DOCUMENT_SENT at 2026-09-17T10:00Z, with no matching artifact, to the Smith fixture, at the fixture asOf. Every one gives **SUPPORTED**, displacing the correct opposing-counsel event:

| actor | output |
|---|---|
| `null` | "External party supplied doc on September 17, 2026." |
| "Jamie Lee" (unknown, could be firm staff) | "Jamie Lee supplied doc…" |
| "Rachel" / "R. Morgan" (the requesting user) | "Rachel supplied doc…" / "R. Morgan supplied doc…" |
| "Client's CFO" / "Jordan Smith's assistant" (client side) | "Client's CFO supplied doc…" / "Jordan Smith's assistant supplied doc…" |

- The correct exclusions do work: exact "Client", "client", "Jordan Smith", "Alex Thompson", "Rachel Morgan", "Paralegal" and "Our firm", and an event whose artifact is from the firm domain.

*Fix:* require positive evidence that the sender is external, and give UNKNOWN for everything else. That means either an artifact `from` whose domain is neither the firm's nor the client's, or an actor matching a known external role (opposing counsel, court, third-party roles). Treat "no artifact or no from" as unclassifiable, not as external. Add tests for a null actor, a first-name or initials own-side actor, and a "client's X" actor.

**Definition (asked):**
- The client is not external (exact name or role label only; see MF1 for the gaps). Our firm is not external: the RA, the requesting user, own-side role labels, and the firm email domain.
- The court and opposing counsel are external, and so is any third party. That matches the docstring at `:1974-1976`.
- Unknown senders are currently external (MF1). They should be UNKNOWN.

**MF2. The slot id doesn't match the system's id, and the slot isn't wired.**
- The derived claim uses `id: "significant-new-information"` (`:1927`, `:1941`). Everything else uses `"significant-information"`: the GT fixture `data/synthetic-current-state.ts:66`, the claim list in `data/synthetic-matter.ts:340`, the drift check in `tests/current-state-ground-truth.test.ts:259,278`, and the layout in `components/status-brief.tsx:83`.
- The PR's own GT test papers over this by looking up `"significant-information"` and then asserting `derived.id === "significant-new-information"`.
- `components/mattermind-app.tsx` is unchanged. So the app still shows the predefined claim, and the PR's "7th and final slot derived" claim is false in the product. Wiring it with the same `claim.id ===` replacement PR #10 used would never match.

*Fix:* return `id: "significant-information"`, wire it in `mattermind-app.tsx` the way important-date is wired, and update the brief text to "7 derived".

**MF3. The tests can't detect breakage of the slot's core rules. The "hang" was in test tooling, and deleting the tests hid 2 real test failures.**
- **Mutations** (each with `timeout 60`; none timed out, all exited 0 with **0 failures**):
  - X1: the external-party filter returns true for everything.
  - X2: the asOf filter is removed.
  - X3 / X4: latest selection is replaced by the first / last element.
  - X5: no-`from` is treated as internal.
  - X6: the firm-domain check is off.
  - X7: the client-email check is off.

  The 3 remaining tests (GT, invalid asOf, no DOCUMENT_SENT) only exercise the Smith fixture. There, the single DOCUMENT_SENT is already external, already before asOf and already the latest.
- **"Deleted tests":** nothing was deleted against main. The deletion happened inside the PR: aad6453 replaced the 615-line block added in 1d082d5/c55b94f with 60 lines. That block held the only coverage for external SUPPORTED, client exclusion, own-side exclusion, latest-of-multiple, and the asOf cutoff. No coverage that the earlier 6 slots rely on was lost; all 165 base tests are present and unedited.
- **Hang root cause** (reproduced at c55b94f; lib is byte-identical to head):
  - Full suite: `timeout 60 npm test` gives EXIT 124 with no TAP output.
  - Truncating the file: up to `:6435` it finishes (1 failure); adding the "latest of multiple" test (`:6436-6554`) makes it hang.
  - Each test alone finishes and **fails**. `:6200` and `:6436` fail because `formatSignificantNewInformation` (`:1954`) lowercases the object ("revised settlement language"), while the tests check `includes("Revised settlement language")` / `includes("Revised proposal")`. That's a test-expectation bug, not a lib bug.
  - The same file bundled with esbuild and run with plain `node --test`: **finishes in 0.7 s, 141 pass / 2 fail**. With source maps on it also finishes. Under tsx (with `--no-enable-source-maps` too) it hangs at about 108% CPU. Replacing those `assert.ok(x.includes(...))` lines with `assert.equal(..., true)` makes tsx finish in about 1 s.
  - So the hang is Node's `assert.ok` failure-message generation (it re-reads and parses the call site) under the tsx loader on a 6.7k-line file. It's triggered by a **failing** `assert.ok`, and is not in lib/.
- **lib/ has no hang:**
  - There are no `while`, `for(;;)`, `do` or recursion in lib/. Latest selection is `events.reduce(compareEventsByTime)` (`:49-51`), which is total and terminating. A mutation there can't loop, which is consistent with the earlier "timeout" really being this assert.ok issue.
  - Fuzz: 3,000 random event lists × all 7 slots (21k calls) in 455 ms. The lists included equal timestamps, duplicate eventIds, a repeated identical object, `occurredAt` null/""/"garbage"/epoch, missing or empty artifact ids, self-referential `parent`/`provenance.ref` cycles, other-matter events, and invalid/empty asOf. 20,000 same-timestamp DOCUMENT_SENTs take 45 ms. An empty list gives UNKNOWN.

*Fix:* restore the 5 behavioural tests with corrected expectations (lowercase object, or check the evidence id) and use `assert.equal`/`assert.match` instead of `assert.ok(…includes…)`. Add MF1 cases and a latest-of-two plus an after-asOf case, so X1-X7 each fail a test.

## Evidence

- **Suite:** base 165/165 EXIT=0 and head 168/168 EXIT=0, both under `timeout 120`. At c55b94f (the PR's earlier test block), `timeout 60` gives EXIT 124 (see MF3).
- **Smith v. Acme GT:** SUPPORTED, "Opposing counsel supplied revised settlement language on September 16, 2026.", evidence `email-0142-revised-language` (matches the fixture). Other probes:
  - asOf before Sep 16 gives UNKNOWN;
  - other-matter events are ignored;
  - an `occurredAt` of "garbage" is ignored (NaN fails `<= asOf`);
  - `occurredAt` null with a recorded time after asOf is excluded;
  - an empty object gives "…supplied document…".
- **Regressions:**
  - The 5-slot probe (6 asOf values × 5 slots, plus owner phrasings) is **byte-identical** between main 7814e20 and head. Main 7814e20 is also byte-identical to ce55f623 on that probe.
  - The PR #10 owner and date probe sets (`p, r, s, t, u, w2`) are byte-identical between base and head.
  - data/ is unchanged.

## Clean-checkout run

Cloud agent `bc-8ffb8584` (Duke's run; read-only, audited).
- HEAD `aad6453d9b`, merge-base `7814e20`, 3 ahead / 0 behind.
- Fresh `npm ci`, `npx tsc --noEmit`, `npm run lint` and `npm run build`: all passed.
- `npm test`: 168/168, 0 fail, 0 cancelled, no timeout, 0.6 s real.
- Diff: lib +151, tests +63/-1. data/, package.json and package-lock.json untouched. Clean tree.

---

## Verification: head cd9f2d3 (Oct 13 2026, ~1:55 AM MT)

**HEAD:** `cd9f2d32ea46db608348c6501d6f6948c8f7aa09` (7 ahead / 0 behind main `7814e20`).
**Diff:** lib +201/-0, tests +276/-1 (import line), `components/mattermind-app.tsx` +11/-1, `components/status-brief.tsx` +1/-1. data/, package.json, package-lock.json, the other lib files and `tests/current-state-ground-truth.test.ts` are byte-identical to main.
**Method:** raw files in `/tmp/p11v`, no clone, no cloud agent.
**Suite:** `timeout 120 npm test` (tsx, full suite) gives EXIT=0, **174/174, 0 fail/cancelled/skipped/todo, 1.3 s real**, so there's no hang with the restored tests. tsc EXIT=0. eslint on lib/, tests/ and components/ EXIT=0.

### Verdict: 2 MUST-FIXES LEFT

**V1. Wrong SUPPORTED: a client-side email from any non-firm domain counts as external.** The docstring (`:2006-2012`) says external means "a domain that is neither the firm's nor the client's". But there is no client-domain check. The only client exclusions are the exact client name or label (`isClientActor`) and `isEmailFromPerson(artifact, matter.client)`. Probes (a DOCUMENT_SENT at Sep 17 added to the Smith fixture, with an extra eligible artifact):
- actor "Client's CFO", from `cfo@smithco.com`: **SUPPORTED "Client's CFO supplied doc on September 17, 2026."** [a-clientcorp]
- actor null, from `cfo@smithco.com`: **SUPPORTED "External party supplied doc…"**
- actor null, from `jordan.smith.personal@gmail.com` (the client's personal mailbox): **SUPPORTED "External party supplied doc…"**

Each of these displaces the correct opposing-counsel answer. (Actor "Jordan Smith" with the same gmail is correctly excluded via the actor.)
*Fix:* the domain path (`:2083-2089`) must not be positive evidence on its own. Either require the domain to belong to a known external participant (e.g. domains seen on opposing-counsel or court artifacts), or exclude client-side actors (`client's …`, names containing the client's name) and client domains learned from client artifacts. Otherwise make the docstring match and accept only role-labelled actors. Add a test for a client-corporate-domain email.

**V2. 5 of the 10 mutations still pass all tests.** Each run took about 1.1-1.3 s; none timed out.

| mutation | failing tests |
|---|---|
| X1 external filter returns true for everything | 3 |
| X2 asOf filter removed | 1 |
| X3 latest → first | 1 |
| X5 unclassified → external | 1 |
| X4 latest → **last** element | **0** (the latest-of-two test lists events in chronological order) |
| X6 firm-domain check off (`:2069`) | **0** |
| X7 client-email check off (`:2058`) | **0** |
| X8 external-role check off (`:2079`) | **0** (the court test is satisfied without it) |
| X9 own-side actor check off | **0** |
| X10 RA/user email check off | **0** |

My original 7 are X1-X7, and 3 of them (X4, X6, X7) still survive.
*Fix:*
- Put the later event first in the latest-of-two test.
- Make the own-firm test use a firm-domain sender who isn't the RA or the user (e.g. `jamie.lee@lawfirm.example` with a null actor), so only the domain check excludes it.
- Make the client test rely on the email alone (null actor, client email).
- Give the court test no artifact.

### Requested checks
- **Leftovers:** I read the full `main...cd9f2d3` diff line by line. There are no `.only`, `.skip` or `todo`, no `console`/`debugger`, no constant `if (true/false)`, no commented-out checks, and no early returns other than the intended ones. The `return true` at `:2096` is the legitimate external-role path.

  Every test-side line removed is the import line, so no existing assert was weakened. The new tests use `assert.equal` (state, value, id) and `assert.deepEqual` (evidence ids). The only `assert.ok` is the existence check for the GT expectation, `assert.ok(expectation, …)`, which can't trigger the tsx message hang in a passing suite.
- **MF1 probes:** all 6 are fixed. Null actor, "Jamie Lee", "Rachel", "R. Morgan", "Client's CFO" and "Jordan Smith's assistant", each with no artifact, are now excluded, and the opposing-counsel answer stands. The firm-domain sender `jamie.lee@lawfirm.example`, a no-domain `from`, "Judge Lee" (not a label) and "Rachel Morgan" from an external domain are also correctly excluded. "Court", "Judge", "Witness" and "Opposing counsel" labels give SUPPORTED, which is intended (external roles).
- **Wiring and drift (MF2): works.**
  - Both claim builders return `id: "significant-information"`.
  - `mattermind-app.tsx` derives the slot and replaces `claim.id === "significant-information"`, so all 7 claims in `data/synthetic-matter.ts` are now derived.
  - The unchanged drift test, `tests/current-state-ground-truth.test.ts:259,278`, passes with the new id.
  - Not blocking (UI text, not a slot value): `status-brief.tsx:51` now says "7 slots derived · 1 slot predefined", and `:230` and `mattermind-app.tsx:224` still say "The other 1 slot remains predefined". There are only 7 slots, and all are derived.
- **Regressions:**
  - Smith v. Acme GT is SUPPORTED, "Opposing counsel supplied revised settlement language on September 16, 2026.", evidence `email-0142-revised-language`.
  - The 5-slot probe is byte-identical to main 7814e20, and so are the PR #10 owner and date probe sets (`p, r, s, t, u, w2`).
  - data/ is unchanged.

### Clean-checkout run (cd9f2d3)

The clean checkout ran as bc-b5f0e617 (read-only, transcript audited). HEAD is cd9f2d32ea, merge-base 7814e20, 7 commits ahead and 0 behind. npm ci, tsc, lint and build all exit 0, and tests are 174/174 with 0 fail in 0.5s. The diff covers 4 files (app +12, status-brief 2 lines, lib +201, tests +277). data, package and lock are unchanged, and the tree is clean.


_(placeholder)_

---

## Verification: head b109c91 (Oct 13 2026, ~2:05 AM MT)

**HEAD:** `b109c91f76f49c5961e1ff5025ea24e04f9de65b`. **BASE:** main `7814e20`.
**Method:** raw files in `/tmp/p11w`, no clone, no cloud agent.
**Suite:** `timeout 120 npm test` (tsx, full suite) gives EXIT=0, 178/178, 0 fail/skip/todo, 1.3 s. tsc EXIT=0. eslint on lib/, tests/ and components/ EXIT=0. data/, package.json, package-lock.json, the other lib files and the drift test are byte-identical to main.
**Probe output:** `/tmp/pr11-b109c91-probes.out`.
**Change since cd9f2d3:** the domain path, artifact map and firm-domain computation are removed. The filter is now `isClientActor` → reject, else `isExternalActor(event.actor)` (`:2045-2056`). The UI text now says "7 slots derived".

### Verdict: 2 ITEMS LEFT (1 wrong answer, 1 test gap)

**V1. Wrong SUPPORTED: `EXTERNAL_ROLE_LABELS` (`:158-170`) lists both `"plaintiff's counsel"` and `"defendant's counsel"`. One of them is always our own firm.**
- Matching is **exact**: `normalizedActorLabel` (`:173-175`) is `trim().toLowerCase()`, then `Set.has`.
- The matter has no plaintiff/defendant side field (`data/synthetic-matter.ts` has none). So on any matter where we represent the plaintiff (Smith v. Acme reads as our client Smith as plaintiff), an event from actor "Plaintiff's counsel", which is us, gives **SUPPORTED "Plaintiff's counsel supplied doc on September 17, 2026."** That displaces the real opposing-counsel answer. The same happens with "Defendant's counsel" on a defence matter.

*Fix:* remove both labels, or resolve them against an explicit matter-side field.

*Same class, Duke's call:* `"expert witness"` / `"witness"` are side-neutral. An expert we retained gives SUPPORTED as external. Consider dropping `expert witness` or requiring a side.

**V2. The latest-event mutation still survives in one direction.** X3 (`getLatestEvent` → first element) fails **0** tests, because the latest-of-two test now lists the later event first. X4 (→ last element) fails 1.
*Fix:* add the mirrored order (earlier event first) as a second case in the same test, so both X3 and X4 fail.

### Requested checks
- **Mutations** (`timeout 60` each, every run about 1.0-1.2 s, none timed out):

| mutation | failing tests |
|---|---|
| X1 filter returns true for everything | 6 |
| X2 asOf filter off | 1 |
| X4 latest → last | 1 |
| role check → any non-null actor (X8) | 3 |
| `"court"` removed from the role set | 1 |
| role normalization not lowercased | 25 |
| X3 latest → first | **0 (V2)** |
| X7 client-actor check off (`:2048`) | 0, an equivalent mutant: no client label can be in the exact external-role set, so the check is redundant |
| matterId filter off | 0, a test gap rather than a wrong answer today; nice-to-have |

  X5/X6 (unclassified → external, firm-domain check) no longer apply, because that code is removed.
- **MF1 probes and the client-email probes:** all fixed. Null actor, "Jamie Lee", "Rachel", "R. Morgan", "Client's CFO", "Jordan Smith's assistant", "Client's CFO" from `cfo@smithco.com`, null actor from `cfo@smithco.com`, null actor from `jordan.smith.personal@gmail.com`, and a null-actor firm-domain sender: none displaces the correct opposing-counsel answer.
- **Labels that could wrongly match:** all correctly give no match. These were "Counsel for client", "our co-counsel", "Co-counsel", "Client's counsel", "Local counsel", "Opposing counsel's client", "Former opposing counsel now at our firm", "Court reporter hired by us", "client court liaison", "Opposing Counsel." (trailing period), "opposing-counsel", and the mixed forms "Jordan Smith (opposing counsel)" and "Opposing counsel Jordan Smith".
  - Case and whitespace: "OPPOSING COUNSEL" and "The Court" match (intended). "  opposing   counsel  " (internal double space) doesn't match, a safe fallback.
  - Exact matching can't produce a substring false positive. The only wrong matches are the side-dependent labels in V1.
- **Leftovers since cd9f2d3:** one commented-out check, `// || isOwnSideActor(event.actor, matter, requestingUser)` at `:2049`. It has no effect today: role-only exact matching means no own-side label or name can be in the external set, which makes the check redundant. Delete it rather than leave it commented out. `eligibleEvidence` and `requestingUser` are now unused parameters (lint passes). No `.only`, `.skip`, debug code or constant conditions. The test diff removes only the old court test and the old latest-of-two event order; it adds 4 client-email tests and the court test with no email, all using `assert.equal`.
- **Regressions:** Smith v. Acme GT is SUPPORTED "Opposing counsel supplied revised settlement language on September 16, 2026." The 5-slot probe and the PR #10 owner and date probe sets are byte-identical to main 7814e20. data/ is unchanged.

### Clean-checkout run (b109c91)

The clean checkout ran as bc-d503a38b (read-only, transcript audited). HEAD is b109c91f76, merge-base 7814e20, 8 commits ahead and 0 behind. npm ci, tsc, lint and build all exit 0, and tests are 178/178 with 0 fail in 0.6s. The diff covers 4 files, +534/-8. data, package and lock are unchanged, and the tree is clean.


_(placeholder)_

---

## Verification: head 7145ee2 (confirm) (Oct 13 2026, ~2:10 AM MT)

**HEAD:** `7145ee2e13f6dd82902480c01c8c209263972e05`. **BASE:** main `7814e20`.
**Method:** raw files and tarball in `/tmp/p11x` and `/tmp/p11clean`, no clone, no cloud agent.
**Change since b109c91:**
- The four side-dependent labels are removed from `EXTERNAL_ROLE_LABELS` (`:158-166`): plaintiff's counsel, defendant's counsel, expert witness, witness.
- The commented-out `isOwnSideActor` line is gone. The filter is now `if (isClientActor(...)) return false; return isExternalActor(...)` (`:2043-2047`).
- Two tests added: an "ambiguous role labels" table test, and a mirrored latest-of-two test with the later event last.

components/, data/, package.json and package-lock.json are unchanged.

### Verdict: SHIP

No wrong SUPPORTED or INFERRED values found.

- **Labels and table test:** all 4 labels are gone. The new table test covers all 4, and checks both alone (gives UNKNOWN) and alongside a valid opposing-counsel event (the opposing-counsel answer stands).
- **Plaintiff's-counsel probe:** "Plaintiff's counsel", "Defendant's counsel", "Expert witness", "Witness", "Plaintiffs counsel", "Counsel for plaintiff" and "Our expert" no longer displace the correct answer. The slot stays SUPPORTED "Opposing counsel supplied revised settlement language on September 16, 2026."
- **Leftovers since b109c91:** none. Only the 4 label deletions, the comment removal, and the 2 added tests, which use `assert.equal`/`assert.deepEqual` with no `.only`/`.skip`/debug code.
- **Mutations** (`timeout 60` each, every run about 1.1-1.5 s, none timed out):

| mutation | failing tests |
|---|---|
| X1 filter returns true for everything | 7 |
| X2 asOf filter off | 1 |
| X3 latest → first | 1 (mirrored test) |
| X4 latest → last | 1 |
| role check → any non-null actor | 4 |
| `"court"` removed | 1 |
| plaintiff's counsel re-added | 1 |
| normalization not lowercased | 27 |
| client-actor check off | 0, an equivalent mutant; redundant under exact role matching |
| matterId filter off | 0, a test gap, not a wrong answer (nice-to-have) |

- **MF1, client-email and role probes:** none displaces the correct answer. These cover null actor, Jamie Lee, Rachel, R. Morgan, Client's CFO and Jordan Smith's assistant; the client corporate email (with and without an actor), the client's Gmail and a firm-domain sender; and all the risky labels from the b109c91 round. Intended external roles give SUPPORTED: "OPPOSING COUNSEL", "The Court", "Judge", "Third party" and "Opposing attorney". Output: `/tmp/pr11-7145ee2-probes.out`.
- **Regressions:** Smith v. Acme GT is unchanged. The 5-slot probe and the PR #10 owner and date probe sets are byte-identical to main 7814e20. data/ is unchanged.

### Clean-checkout run (7145ee2)

This was a **tarball run on Grok Bot's shared Linux box**, not a cloud VM (Duke couldn't start a cloud run this round). I extracted `https://codeload.github.com/CoderDrew/legal-system/tar.gz/7145ee2` into a fresh `/tmp/p11clean`. There was no git checkout, so there's no merge-base or git status; the tree is exactly the tarball.

| step | result |
|---|---|
| `npm ci` | EXIT=0 |
| `npx tsc --noEmit` | EXIT=0 |
| `npm run lint` | EXIT=0 |
| `timeout 600 npm test` | EXIT=0; `# tests 180 / # pass 180 / # fail 0 / # cancelled 0 / # skipped 0 / # todo 0`; no `not ok`; duration_ms 581, about 1.1 s wall time on a rerun |
| `npm run build` | EXIT=0 ("Compiled successfully in 2.7s") |
