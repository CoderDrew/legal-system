# Intake Discovery Track

**Status: DISCOVERY TRACK. NOT APPROVED FOR IMPLEMENTATION.**

- **CONSTRAINT:** No intake code exists in this repository, and none is to be built under this track.
- **CONSTRAINT:** Decision of Oct 2, 2026: Drew Reutlinger chose option **(c) Park intake** from §0 of the [parked proposal](./intake-v1-proposal-parked.md#0-decision-needed-from-drew). The approved MatterMind V1 remains the read-only active-matter status brief ([`mvp-selection.md`](../../mvp/mvp-selection.md)).
- Intake keeps its MVP disposition: **Reserved**, "pending stronger evidence of volume, pain, or cost" ([`mvp-selection.md`](../../mvp/mvp-selection.md#candidate-disposition)).
- This folder preserves the intake work as discovery evidence. Like the rest of `docs/discovery/`, it does not turn findings into requirements, feature commitments, or solution decisions.

## Why intake is parked

- **CONTEXT:** The MVP selection found that discovery "did not establish sufficient pain, volume, or return on investment" for intake ([`mvp-selection.md`](../../mvp/mvp-selection.md#why-this-workflow-was-selected)).
- **CONTEXT:** The approved V1 lists "Automate prospective-client intake." and "… or update Clio." among its non-goals ([architecture](../../architecture/mattermind-v1-architecture.md#explicit-v1-non-goals)).
- **OBSERVATION:** The intake proposal added no new volume or frequency evidence. Interviews 001–003 contain no counts ([002 L184–188]; [003 L159–160]).

## Evidence base

| ID | Stakeholder | Record | Use in this track |
| --- | --- | --- | --- |
| 001 | Rachel Morgan, Director of Legal Operations | [`001-legal-operations-director.md`](../001-legal-operations-director.md) | PRIMARY. The record is partial. |
| 002 | Maria Santos, Intake Coordinator | [`002-intake-coordinator.md`](../002-intake-coordinator.md) | PRIMARY |
| 003 | David Chen, Employment Attorney | [`003-employment-attorney.md`](../003-employment-attorney.md) | PRIMARY |
| 004, 005 | Karen Mitchell, Paralegal; Lisa Grant, Legal Assistant | [`004`](../004-paralegal-active-matter-status.md), [`005`](../005-legal-assistant-deadlines-followup.md) | Not used. No independent intake facts. |

Line cites such as `[002 L55]` refer to line numbers in these records as of commit `5c9015c`.

## Contents

| File | What it holds |
| --- | --- |
| [`intake-v1-proposal-parked.md`](./intake-v1-proposal-parked.md) | The final intake V1 proposal, with a PARKED banner. Its text is otherwise unchanged. |
| [`workflow-reconstruction.md`](./workflow-reconstruction.md) | The current intake workflow, step by step, marked KNOWN / ASSUMED / GAP |
| [`team-analysis-summary.md`](./team-analysis-summary.md) | The three team analyses and four cross-challenges condensed into one file, disagreements included |
| [`rejected-features.md`](./rejected-features.md) | Each rejected or out-of-scope feature, who ruled it out, and why |
| [`v1-1-ideas.md`](./v1-1-ideas.md) | Later candidates and their gates: AI party-name suggestions, a human-confirmed Clio write, Grow buy-vs-build, and others |
| [`reopening-research-plan.md`](./reopening-research-plan.md) | The evidence that would justify reopening intake, interview questions, and the Clio/Grow capabilities to verify |

## Open questions

The intake open questions live in [proposal §5](./intake-v1-proposal-parked.md#5-open-questions), [reconstruction gaps G1–G17](./workflow-reconstruction.md#gap-open-question-no-source) and [`reopening-research-plan.md`](./reopening-research-plan.md). [`open-questions.md`](../open-questions.md) links to them.

## Reopening

- Intake reopens only through a new, dated decision by Drew, recorded in [`mvp-selection.md`](../../mvp/mvp-selection.md).
- The thresholds in [`reopening-research-plan.md`](./reopening-research-plan.md) are proposals for Drew to set. They are not commitments.
- Until intake reopens, no intake fixtures, types, routes, components or tests are added.

## Working files not committed

The proposal and reconstruction cite team working files: `brief.md`, `analysis-recondo.md`, `analysis-mainframe.md`, `analysis-dial-tone.md`, `challenge-recondo.md`, `challenge-mainframe.md`, `challenge-dial-tone.md` and `challenge-filecard.md`. They are condensed in [`team-analysis-summary.md`](./team-analysis-summary.md) and are not committed.
