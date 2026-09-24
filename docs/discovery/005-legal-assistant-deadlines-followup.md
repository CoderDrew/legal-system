# Discovery Interview 005 — Legal Assistant: Deadlines and Follow-Up

## Interview record

- **Stakeholder:** Lisa Grant, Legal Assistant
- **Organization:** Fictional law firm
- **Experience:** Approximately nine years with the firm
- **Interview date:** Not provided
- **Objective:** Investigate how a date, commitment, or obligation becomes something the firm actively tracks, including how it is discovered, interpreted, verified, recorded, assigned, changed, monitored, and handled when the responsible person does not see the originating communication.
- **CONSTRAINT:** The workflow is nonlinear and must not be forced into an overly simple sequence.

## Stakeholder role and tools

- **FACT:** Lisa supports three attorneys across employment and business matters.
- **FACT:** Her responsibilities include calendars, tasks, court dates, response dates, client follow-ups, matter-related deadlines, and other tracked obligations.
- **FACT:** Her common tools include Clio, Outlook, and Microsoft 365 documents.

## Example workflow

- **OBSERVATION:** Lisa demonstrated a recent business matter.
- **OBSERVATION:** An email arrived from opposing counsel with a PDF attached.
- **OBSERVATION:** The email itself did not clearly identify the deadline Lisa ultimately needed to track.
- **OBSERVATION:** The relevant information was inside the attached document.
- **FACT:** Lisa recognized the document type as one that could contain dates or obligations requiring action.
- **OBSERVATION:** Several pages into the PDF, she identified language that appeared to establish a response date.
- **OBSERVATION:** Lisa did not immediately create a deadline.
- **OBSERVATION:** She identified the potentially relevant language, checked the matter in Clio, reviewed existing calendar entries and tasks, sent the information to the attorney, requested confirmation of her interpretation, waited for confirmation, and created or updated the authoritative deadline or task only after confirmation.
- **FACT:** Depending on the matter and deadline, Lisa may also maintain a corresponding Outlook calendar entry.

## Critical decision boundary

- **FACT:** Lisa explicitly corrected the idea that she makes final legal determinations about deadlines.
- **FACT:** Her responsibility is to identify something that may create or modify an obligation and escalate it for appropriate verification.
- **FACT:** For legally significant deadlines, an attorney confirms the interpretation.
- **FACT:** Lisa treats the date as authoritative and records it accordingly only after confirmation.
- **OBSERVATION:** Detecting a possible obligation, extracting a possible date, interpreting the source, authoritatively determining the firm's legal deadline, and recording and tracking the confirmed deadline are distinct activities.
- **CONSTRAINT:** These activities must not be collapsed into one automated action.

## Simplified obligation lifecycle

The following lifecycle emerged as a discovery aid:

> Trigger → Detect → Interpret → Validate → Record → Monitor → Modify → Complete

- **CONSTRAINT:** This lifecycle is a discovery model, not a finalized product workflow.
- **OBSERVATION:** Different kinds of obligations can begin with different triggers while passing through similar lifecycle stages.

## Sources of obligations

### Formal or document-derived obligations

- **FACT:** Examples include court communications, orders, notices, discovery-related documents, and other formal documents that may establish dates or required actions.
- **FACT:** Lisa recognizes many of these through experience.
- **FACT:** Certain document types receive immediate attention because she knows they may contain deadlines.

### Communication-derived obligations

- **FACT:** Not all obligations originate in formal documents.
- **FACT:** An ordinary email conversation may create a commitment.
- **FACT:** For example, opposing counsel and a firm attorney may agree by email that the firm will provide something by Friday.
- **FACT:** The commitment may be buried inside an otherwise routine email thread and still require tracking.

### Internally created follow-ups

- **FACT:** Some tracked obligations are created internally rather than imposed by an external source.
- **FACT:** For example, an attorney may ask Lisa to remind the attorney to follow up next Wednesday if the firm has not heard from someone.
- **FACT:** This creates a follow-up task even though no court order, external document, or opposing-party communication established the date.

## How Lisa knows where to look

- **FACT:** Lisa relies on experience, document type, sender and context, existing matter knowledge, being copied on communications, attorneys forwarding relevant communications, explicit instructions to calendar or track something, and awareness that the firm is waiting for a particular event.
- **FACT:** Formal court-related material receives strong attention.
- **FACT:** Ordinary email communication is more difficult because important commitments may appear inside otherwise routine conversations.

## Visibility boundary

- **FACT:** Lisa does not receive every relevant communication directly.
- **FACT:** Sometimes she is copied, and sometimes she is not.
- **FACT:** A communication may go directly to an attorney.
- **FACT:** The attorney may forward it to Lisa, tell her what must be calendared, save it to the matter, or otherwise communicate the obligation.
- **FACT:** When asked how she knows about an important communication when she is not included, Lisa stated, “I don't, unless somebody sends it to me or it gets saved to the matter and I see it.”
- **OBSERVATION:** Visibility to the person responsible for tracking is a workflow boundary.
- **CONSTRAINT:** This evidence must not be interpreted as proof that the firm routinely misses legal deadlines.
- **CONSTRAINT:** It identifies a potential workflow boundary, not evidence of catastrophic failure.

## Human memory

- **FACT:** Lisa stated that human memory is involved in the process.
- **FACT:** Attorneys remember to forward relevant communications.
- **FACT:** Lisa may remember that the firm is waiting for something.
- **FACT:** Staff may remember internally created follow-ups.
- **FACT:** Existing matter knowledge helps staff recognize important incoming information.
- **OBSERVATION:** Human memory currently functions as part of the workflow.

## Late discovery of obligations

- **FACT:** Lisa has learned about a deadline or follow-up later than she would have preferred because she was not copied or the information was not sent to her.
- **FACT:** She characterized this as occurring, but not frequently.
- **FACT:** More common examples involve an attorney agreeing to provide something by a certain date, someone agreeing to follow up with a client, or another commitment in ordinary communication.
- **FACT:** Lisa may learn about a commitment later when the attorney remembers it, someone asks about it, or she encounters the communication while searching for something else.

## Legal deadline risk and safeguards

- **FACT:** Lisa did not claim that this process has caused the firm to miss a court deadline.
- **FACT:** She is not aware of the firm “blowing” a court deadline because of this process.
- **FACT:** She has seen situations become closer to a deadline than she would prefer.
- **FACT:** Lisa explained that serious deadlines are not routinely missed in part because staff are highly cautious and double-check them.
- **OBSERVATION:** The current process contains human safeguards that appear meaningful, particularly for high-risk deadlines.
- **CONSTRAINT:** The current process must not be characterized as broken.
- **CONSTRAINT:** Missed court deadlines must not be invented or implied.
- **CONSTRAINT:** Risk must not be exaggerated beyond the stakeholder's account.

## Deadline changes

- **FACT:** Deadline management includes changing existing deadlines as well as creating new ones.
- **FACT:** A deadline may change because opposing counsel requests an extension, an attorney agrees to an extension, a court order modifies a date, or another event changes the obligation.
- **FACT:** Lisa emphasized that multiple conflicting dates must not remain active.
- **FACT:** When a deadline changes, she may need to update Clio calendar entries, Clio tasks, and Outlook calendar entries.
- **OBSERVATION:** A single business fact may be represented in multiple locations.
- **OBSERVATION:** Humans currently keep those representations synchronized.

## Interpretation and deterministic state

- **OBSERVATION:** Before confirmation, a statement such as “This document appears to create a deadline of October 16” is an interpretation that may require professional review.
- **OBSERVATION:** After attorney confirmation, “The authoritative tracked deadline is October 16” becomes structured workflow state.
- **OBSERVATION:** Future analysis should distinguish assistance identifying candidate obligations, assistance extracting possible dates, human or legal interpretation, human approval, and deterministic recording and tracking of approved obligations.
- **CONSTRAINT:** This distinction does not establish an architecture decision.

## Direct observations

- **OBSERVATION:** Deadline and follow-up management is not one linear workflow.
- **OBSERVATION:** Potential obligations can originate from multiple sources.
- **OBSERVATION:** The person responsible for tracking an obligation may not be the person who receives or creates it.
- **OBSERVATION:** Some important obligations are contained in formal documents.
- **OBSERVATION:** Other obligations can be embedded in routine email conversations.
- **OBSERVATION:** Some follow-ups are created internally through attorney or staff decisions.
- **OBSERVATION:** Experience and matter knowledge play a significant role in recognizing potentially actionable information.
- **OBSERVATION:** Lisa does not make final legal determinations about significant deadlines.
- **OBSERVATION:** Attorney verification is an intentional control for legally significant deadline interpretation.
- **OBSERVATION:** Once a deadline is confirmed, deterministic systems such as calendars and tasks represent the authoritative tracked state.
- **OBSERVATION:** Deadline changes can require updates across multiple systems.
- **OBSERVATION:** Human memory and communication bridge gaps between the person receiving information and the person responsible for tracking it.
- **OBSERVATION:** The existing process includes meaningful safeguards, especially around high-risk legal deadlines.

## Hypotheses requiring validation

- **HYPOTHESIS:** A significant workflow weakness may occur before deadline tracking begins, when identifying communications or documents that may create, modify, satisfy, or cancel an obligation.
- **HYPOTHESIS:** Assistance detecting candidate obligations across communications and documents could reduce dependence on manual forwarding and human memory.
- **HYPOTHESIS:** AI may be more appropriate for identifying and surfacing potential obligations than for authoritatively determining legal deadlines.
- **HYPOTHESIS:** Human approval may be necessary before candidate legal deadlines become authoritative workflow state.
- **HYPOTHESIS:** After an obligation is approved, deterministic automation may be more appropriate than AI for recording, assigning, tracking, updating, and escalating it.
- **HYPOTHESIS:** Synchronization across Clio and Outlook may create additional operational complexity.
- **HYPOTHESIS:** Lower-risk follow-ups and communication-derived commitments may be more vulnerable to late discovery than formal court deadlines.

These hypotheses have not been validated and must not be treated as requirements.

## Product boundaries

- **CONSTRAINT:** The interview does not support autonomous AI deadline determination.
- **CONSTRAINT:** A future system must not be assumed to decide what legally constitutes a deadline or determine legal consequences.
- **CONSTRAINT:** A future system must not be assumed to modify authoritative deadlines without approval or create binding legal workflow state solely from model output.
- **HYPOTHESIS:** Further investigation may determine whether software could assist people by detecting potentially actionable communications, identifying candidate dates, surfacing relevant source language, or routing candidate obligations for review.
- **CONSTRAINT:** These possibilities remain hypotheses, not product requirements.

## Workflow-model examples

### Formal document

> Formal document → Lisa recognizes a potentially actionable document → candidate date or obligation identified → attorney confirms → confirmed deadline recorded in Clio → task or calendar monitored → deadline updated if circumstances change → obligation completed

### Email agreement

> Communication occurs → someone recognizes a commitment → meaning and date interpreted → appropriate confirmation → follow-up or task recorded → monitored → modified if needed → completed

### Internal follow-up

> Attorney decides a future follow-up is needed → instruction communicated → follow-up recorded → monitored → modified if needed → completed

- **CONSTRAINT:** These examples are discovery aids and are not exhaustive workflows.

## Open questions

- **OPEN QUESTION:** How many legally significant deadlines are created or modified in a typical week?
- **OPEN QUESTION:** How many lower-risk follow-ups or communication-derived commitments are created in a typical week?
- **OPEN QUESTION:** How frequently does Lisa learn about an obligation later than she would prefer?
- **OPEN QUESTION:** How representative is Lisa's process across other legal assistants and practice groups?
- **OPEN QUESTION:** Which categories of documents are considered likely to contain actionable deadlines?
- **OPEN QUESTION:** Which incoming channels must currently be monitored?
- **OPEN QUESTION:** How reliably are incoming communications associated with Clio matters?
- **OPEN QUESTION:** What integrations currently exist between Outlook and Clio?
- **OPEN QUESTION:** What integrations currently exist between Microsoft 365 documents and Clio?
- **OPEN QUESTION:** What happens when a potential deadline is ambiguous?
- **OPEN QUESTION:** How is attorney confirmation documented?
- **OPEN QUESTION:** Are there situations where two attorneys interpret the same deadline differently?
- **OPEN QUESTION:** What is the authoritative source when Clio and Outlook contain different dates?
- **OPEN QUESTION:** How are deadline changes audited?
- **OPEN QUESTION:** What controls prevent an old deadline from remaining active after an extension?
- **OPEN QUESTION:** How are completed obligations closed?
- **OPEN QUESTION:** What happens when a tracked obligation approaches its due date without completion?
- **OPEN QUESTION:** What escalation mechanisms currently exist?
- **OPEN QUESTION:** Who owns final verification that an obligation has been satisfied?
- **OPEN QUESTION:** Which types of obligations require mandatory human approval?
- **OPEN QUESTION:** Are there low-risk follow-ups that could safely use a different approval model?

## Cross-workflow findings

### Intake

- **FACT:** Intake evidence has been gathered from Rachel Morgan, Maria Santos, and David Chen.
- **OBSERVATION:** Themes include manual transfer of structured information, shared-inbox ownership, party identification, conflict-review preparation, attorney assignment, handoffs, status synchronization, and document comprehension.

### Active-matter status

- **FACT:** Active-matter-status evidence has been gathered from Rachel Morgan, David Chen, and Karen Mitchell.
- **OBSERVATION:** Themes include information distributed across systems, manual matter-state reconstruction, relevant recent context in Outlook and Microsoft 365, current state not always available in one place, source verification, and time required to resume active matters.

### Deadlines and follow-up

- **FACT:** Deadline and follow-up evidence has been gathered from Rachel Morgan and Lisa Grant.
- **OBSERVATION:** Themes include multiple obligation sources, human recognition of potentially actionable material, human or legal interpretation, attorney verification, deterministic recording of confirmed obligations, multiple calendar or task representations, deadline modification, and reliance on forwarding, visibility, experience, and memory.

## Recurring pattern across discovery

- **OBSERVATION:** Across the three candidate problem areas, work occurs across multiple systems.
- **OBSERVATION:** Important information may exist in Clio, Outlook, Microsoft 365 documents, Teams, SharePoint, submitted documents, human memory, and institutional knowledge.
- **CONSTRAINT:** Clio remains the established matter-management system and is staying.
- **CONSTRAINT:** The firm does not want another independently maintained system of record.
- **OBSERVATION:** Employees perform manual work to transfer information, determine ownership, reconstruct context, identify relevant information, maintain workflow state, verify sources, and keep multiple representations synchronized.
- **CONSTRAINT:** This pattern does not establish that the solution should be a unified AI layer, integration platform, retrieval-augmented generation system, agent, or any other specific architecture.

## Discovery status

- **FACT:** Five stakeholder interviews have been conducted: Rachel Morgan, Director of Legal Operations; Maria Santos, Intake Coordinator; David Chen, Employment Attorney; Karen Mitchell, Paralegal; and Lisa Grant, Legal Assistant.
- **OBSERVATION:** All three original candidate problem areas have now received direct investigation: intake, active-matter status, and deadlines and follow-up.
- **CONSTRAINT:** No MVP has been selected.
- **CONSTRAINT:** No architecture has been selected.
- **CONSTRAINT:** No AI model or provider has been selected.
- **CONSTRAINT:** No final product requirements have been established.
- **CONSTRAINT:** No decision has been made about which workflow should become the MVP.

## Learning note

- **OBSERVATION:** During this interview, Drew identified nonlinear and stateful workflow discovery as more challenging for him than tracing linear workflows.
- **OBSERVATION:** The deadline workflow became difficult to hold mentally because it contains multiple trigger types, multiple entry points, interpretation, approval, state changes, exceptions, cross-system synchronization, and different risk levels.
- **OBSERVATION:** A useful technique emerged: when a workflow begins to feel like disconnected branches, zoom out and identify a lifecycle model before continuing detailed discovery.
- **OBSERVATION:** For this workflow, that model is: Trigger → Detect → Interpret → Validate → Record → Monitor → Modify → Complete.
- **CONSTRAINT:** This is a project-learning observation, not a product weakness or product requirement.

## Next phase boundary

- **CONSTRAINT:** Do not create additional fictional stakeholder interviews.
- **CONSTRAINT:** Do not select an MVP yet.
- **CONSTRAINT:** Do not create a product specification or architecture documentation yet.
- **OBSERVATION:** The next project activity is a deliberate discovery synthesis comparing the evidence for intake, active-matter status, and deadlines and follow-up.
- **OBSERVATION:** That synthesis should examine what has been established, what remains hypothetical, relative evidence strength, demonstrated business value, risks, deterministic problems, possible areas for AI assistance, whether evidence supports MVP selection, and whether targeted additional discovery is required.
