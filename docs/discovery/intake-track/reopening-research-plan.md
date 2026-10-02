# Intake: Reopening Research Plan

**Status: DISCOVERY TRACK. NOT APPROVED FOR IMPLEMENTATION.** See [`README.md`](./README.md).

What evidence would justify reopening intake, and how to get it. Every number below is a **proposal for Drew to set**, not a finding: discovery 001–003 contains no volumes or frequencies [002 L184–188; 003 L159–160]. In this simulated engagement, counts come from the next simulated interview or from figures Drew supplies.

## 1. Proposed reopening thresholds

Baseline window: 2–4 weeks of counts, measured rather than estimated (CONSTRAINT [003 L53–54]).

| Signal | How to measure | Proposed threshold | Evidence today |
| --- | --- | --- | --- |
| Website inquiry volume | Mailbox count per week | ≥ 15 per week | None. OPEN QUESTION [002 L185] |
| Re-typing time | Time a sample of ≥ 10 website entries into Clio | Median ≥ 5 min per entry **and** ≥ 2 staff-hours per week in total | FACT that it happens [002 L51]; no duration |
| Transcription errors | Audit a sample of new Clio contacts against the source email | ≥ 5% of entries with a wrong phone, email or name | FACT that it happens [002 L54]; no rate |
| Duplicate contacts | Count new contacts in the window that duplicate an existing one, including name variants | ≥ 5% of new contacts, or ≥ 2 per month | FACT that it happens [002 L54–55]; no rate |
| Late-found parties | Parties added after the original conflict check | ≥ 1 per month. **Any** late party that produced a real conflict hit reopens the conflict-coverage work on its own. | FACT: "occasionally" [002 L64]; no count |
| Status chasing | Prospect calls about status that need Maria to contact an attorney or assistant | ≥ 3 per week, **or** ≥ 20% of decided prospective matters not reflected in Clio after 2 business days | FACT that it happens [002 L99–100; 003 L83]; no count |
| Silent drops | Mailbox-vs-Clio reconciliation over the window | ≥ 1 inquiry with no Clio record and no response after 2 business days | OBSERVATION: undetectable today (Dial-Tone T1) |
| Representativeness | Second-attorney interview (§2.3) | The decision-recording and handoff pattern holds outside David's practice group | CONSTRAINT: no generalising from two people [002 L209] |

**Proposed reopening rule:** at least two quantitative thresholds met, plus the representativeness check, **or** the late-party severity override. Before any build is reconsidered, the Clio admin session (§3) must also confirm that Grow is not licensed or planned. Otherwise buy-vs-build comes first.

## 2. Interview questions

### 2.1 Clio admin (with Rachel if needed)
1. Which plan is the firm on, under the current or a legacy name? Is Clio Grow licensed or being considered? [002 L182–183]
2. How is a prospective matter represented: Pending status, a stage, a custom field, a Grow pipeline matter? Which field or status is supposed to hold the attorney's decision? [003 L163] (G3)
3. Are matter stages or automated workflows configured, and for which practice areas? What does "existing configuration" include, and who maintains it? [001 L62]
4. Does intake use the Conflict Check feature or plain global search? Flex or Exact? Are name variations entered? Are checks closed and linked to the matter, and who can view the reports? (Dial-Tone CQ1)
5. Is "Notify assignee when task is assigned" normally ticked on intake review tasks?
6. Is API access enabled, and may the firm register an app? Are any webhooks in use?
7. Is there an audit history of conflict searches? [002 L197]
8. Is Document Analyzer enabled, and does it accept prospective matters?

### 2.2 Maria (follow-up)
1. Last 2–4 weeks: inquiries by path (website, phone); duplicate claims; transcription errors noticed; duplicate contacts created; late-found parties; status-chase calls. [002 L184–188]
2. Time three website entries into Clio, live.
3. For each late-found party: who found it, when (review, consultation, later), and who re-ran the search? (G7)
4. What makes a hit "clearly irrelevant"? Is the dismissal recorded anywhere? [002 L75] (G5)
5. How is a questionable hit escalated, to whom, and how fast? [002 L76]
6. Who are the four mailbox users? Is David one of them? (G16, Q-C)
7. Does the website form already ask for other people or organizations involved? What platform runs it? [002 L181]
8. Does anyone acknowledge a submission, or tell a declined prospect? (G10)

### 2.3 Second attorney, another practice group
1. How do prospective matters reach you, and how do you notice the Clio task?
2. Walk through your last consult, more-info and decline decisions. Where did each get recorded? [003 L163]
3. When you use Teams or email instead of Clio, why: notification settings, friction, or habit? [003 L165] (Q-A)
4. How do you reach the original submission and documents? Do you have mailbox access? (G16)
5. Do referrals or existing clients come to you directly? When does the conflict check happen on those paths, and who runs it? [001 L24–25] (G1, G2)
6. Time two real reviews. Would you trust an extracted party list or summary, and what would you need to check first? [003 L98–101]
7. Who tells a declined prospect, and is it recorded? (G10)

## 3. Clio/Grow capabilities to verify

All **UNVERIFIED** for this firm. The links are Clio public docs that Recondo read on Oct 2, 2026. The docs change often, so re-check before any decision.

| Capability | What to check | Why it matters | Public doc |
| --- | --- | --- | --- |
| Plan tier | Current tier; mapping from any legacy plan name; whether "Apps and integrations" governs custom API apps | Conflict check, custom fields and apps are Core+; stages and automated workflows are Signature+; Grow is Elite or an add-on | [Pricing](https://www.clio.com/pricing/) |
| Grow intake forms | Public website form; contact blocks for other parties; file-attachment questions; the single preset assignee; confirmation email | Could cover re-keying, documents and the A4 party field without a build. One fixed assignee and an auto-confirmation could hide unclaimed inquiries. | [Form templates](https://help.clio.com/hc/en-us/articles/9073499214747-Set-Up-Clio-Grow-Intake-Form-Templates); [Question fields](https://help.clio.com/hc/en-us/articles/9284521443611-Intake-Form-Question-Fields) |
| Grow leads inbox | Accept / ignore flow; whether a claim or lock stops two people accepting the same lead | The duplicate-claim problem [002 L34] | [Manage Leads](https://help.clio.com/hc/en-us/articles/9290604239003-Manage-Leads-in-Clio-Grow) |
| Grow → Manage conversion | What converts (documents, custom fields) and what doesn't (status, assignee, tasks) | Gaps reappear at conversion | [Convert matters](https://help.clio.com/hc/en-us/articles/9286116462747-Filter-Export-and-Convert-Matters) |
| Conflict check modes and name variants | Flex vs Exact; whether Flex links nicknames (Bob → Robert) or only spellings; the name-variation fields | Variant misses are the main false-negative mechanism (Dial-Tone M1, Q2) | [Run Conflict Checks](https://help.clio.com/hc/en-us/articles/41182681954331-Run-Conflict-Checks-in-Clio-Manage-and-Clio-Grow); [Search settings](https://help.clio.com/hc/en-us/articles/43953875528731-Customize-Conflict-Check-Search-Settings) |
| Conflict report | PDF on close; link to the matter; auto-close after 3 days; admin-only viewing by default; the firm-wide CSV list | Proposed as the "was X checked?" record (Part A A2). Linking is manual. | [Run Conflict Checks](https://help.clio.com/hc/en-us/articles/41182681954331-Run-Conflict-Checks-in-Clio-Manage-and-Clio-Grow) |
| Conflict report via API | Whether any v4 endpoint reads or runs conflict checks (none found; an absence, not a confirmation) | If none exists, nothing outside Clio can read coverage, and any coverage feature stays out (CQ3) | [Manage API v4](https://docs.developers.clio.com/clio-manage/api-reference/) |
| Prospective-matter representation | Pending status ("a case your firm is still considering") vs stage vs custom field | Defines what "stale" means (G3) | [Matter Status](https://help.clio.com/hc/en-us/articles/9286056633115-Matter-Status) |
| Stages | Configured per practice area? Default first stage; days-in-stage; API exposes current stage but not history | A new matter defaults to the first stage, so an unmoved matter looks legitimate | [Matter Stages](https://help.clio.com/hc/en-us/articles/15083241879195-Create-and-Manage-Matter-Stages); [Developer FAQ](https://docs.developers.clio.com/faq/) |
| Automations | Triggers (matter created, stage changed); task lists; behaviour when the responsible attorney is missing | Documented to fail with an error, so the next task may never be created (Dial-Tone #18) | [Manage Automated Workflows](https://help.clio.com/hc/en-us/articles/35132279298843-Clio-Manage-Automated-Workflows); [Grow Automated Workflows](https://help.clio.com/hc/en-us/articles/17770743592219-Clio-Grow-Automated-Workflows) |
| Notify on assign | Opt-in checkbox per task; no automatic reminders; any overdue alert | Whether unreliable task monitoring is a settings problem or a behaviour problem | [Task Notifications](https://help.clio.com/hc/en-us/articles/9206714957211-Task-Notifications-and-Reminders) |
| API and webhooks | Contacts, matters and tasks endpoints; webhook lifetime (3-day default, 31-day maximum); delivery limited to records the authorizing user can see | The read path for any later bridge; webhooks need active renewal | [Manage API v4](https://docs.developers.clio.com/clio-manage/api-reference/); [Webhooks](https://docs.developers.clio.com/guides/clio-manage/webhooks/) |
| Grow API and Lead Inbox | Grow API ("as of January 2026"); no webhooks found; legacy `POST /inbox_leads` carries no attachments | Limits on a website → Grow bridge | [Grow API](https://docs.developers.clio.com/clio-grow/api-reference/); [Lead Inbox API](https://docs.developers.clio.com/guides/clio-grow/lead-inbox-api/) |
| Duplicate contacts | Bulk tool removes identical duplicates only; any warning at creation | Robert/Bob duplicates [002 L55] need a candidate check | [Edit and Delete Contacts](https://help.clio.com/hc/en-us/articles/9290520359579-Edit-and-Delete-Contacts) |
| Outlook add-in | "The add-in cannot be used for shared inboxes." | The intake mailbox is shared [002 L20–21], so documents can't be filed from it this way | [Outlook Add-in](https://help.clio.com/hc/en-us/articles/9125228224539-Clio-s-Outlook-Add-in) |
| Document Analyzer | Works on pending prospective matters ("Select an open matter")? Plan tier? Citation quality against David's bar | Buy before building any attorney summary; its misses are silent if it ever feeds the conflict search | [Analyze Documents](https://help.clio.com/hc/en-us/articles/33476998957211) |
