# Discovery Interview 002 — Intake Coordinator

## Interview record

- **Stakeholder:** Maria Santos, Intake Coordinator
- **Organization:** Fictional law firm
- **Experience:** Approximately four years with the firm
- **Interview date:** Not provided
- **Objective:** Understand how intake happens in practice rather than relying only on documented or management-described processes. Follow a website inquiry from arrival through handoff to an attorney and identify meaningful differences in the phone-intake path.

## Stakeholder role

- **FACT:** Maria handles most website inquiries and many phone inquiries routed through reception.
- **FACT:** Maria coordinates prospective-client intake before attorney review.

## Website intake workflow

### Inquiry arrival

- **FACT:** Website inquiries arrive in a shared Outlook mailbox named “New Client Intake.”
- **FACT:** Four employees have access to the mailbox.
- **FACT:** The website form places submitted information into an email.
- **FACT:** Submitted information can include the prospective client's name, email address, phone number, type of legal help requested, how the prospective client heard about the firm, a free-text description of the issue, and file attachments.
- **OBSERVATION:** The example reviewed during the interview contained approximately three paragraphs of free-text information, one PDF, and two Word documents.
- **OBSERVATION:** The incoming email did not itself appear to create a record in Clio.

### Intake ownership

- **FACT:** The four intake employees coordinate ownership of incoming inquiries manually.
- **FACT:** They use Outlook categories named for individual staff members.
- **FACT:** Applying a person's category indicates that the person is handling the inquiry.
- **FACT:** After an inquiry has been entered into Clio, the email is moved into a Processed folder.
- **FACT:** Opening an email does not establish ownership.
- **FACT:** Maria reported that two people occasionally begin working on the same inquiry at approximately the same time.
- **FACT:** Maria reported that inquiries sometimes remain unclaimed longer than intended when staff are busy or assume someone else is handling them.
- **FACT:** Prospective clients have called about inquiries submitted the previous day after not receiving a response.
- **FACT:** Maria is not aware of an inquiry being completely lost.

### Initial review

- **FACT:** After claiming an inquiry, Maria reads the submission to determine what the prospective client is contacting the firm about and whether enough information has been provided to proceed.
- **FACT:** Prospective clients do not always select the correct practice area.
- **FACT:** Free-text descriptions may not provide enough information to classify the matter.
- **FACT:** When necessary, Maria contacts the prospective client by email or phone to collect additional information.

### Clio entry

- **FACT:** Maria searches Clio for the prospective client's name before creating a new contact.
- **FACT:** The person may already exist as an existing client, a former client, or someone who previously contacted the firm.
- **FACT:** If no appropriate contact exists, Maria creates one.
- **FACT:** Maria manually transfers contact information and basic matter information from the website inquiry into Clio.
- **OBSERVATION:** During the observed workflow, Maria repeatedly switched between Outlook and Clio while transferring information.
- **FACT:** Maria reported that data-entry mistakes have occurred.
- **FACT:** Examples reported by Maria include incorrectly entered phone numbers, misspelled names, and duplicate contacts.
- **FACT:** A duplicate can occur when the name used during a search differs from an existing record, such as “Robert Smith” versus “Bob Smith.”

### Party identification

- **FACT:** Before running the conflict search, Maria identifies opposing parties and other relevant parties.
- **FACT:** Some parties are explicitly identified in the website submission.
- **FACT:** Other parties may appear only in submitted documents.
- **FACT:** Some prospective clients do not initially provide all relevant party names.
- **FACT:** Maria may need to open and review attachments to determine which names should be included in the conflict search.
- **FACT:** Maria reported that parties have occasionally been identified later that were not included in the original conflict check.
- **FACT:** When this happens, an additional conflict search must be performed.
- **FACT:** Maria is not aware of the firm accepting a matter it should not have accepted because of one of these omissions.
- **FACT:** Attorneys have asked whether particular people were checked and discovered that they were not included in the original search.

### Conflict search and review

- **FACT:** Maria adds relevant parties and runs the conflict search in Clio.
- **FACT:** Clio can return multiple possible matches.
- **FACT:** A name match does not automatically establish an actual conflict.
- **FACT:** Maria reviews the search results.
- **FACT:** Clearly irrelevant matches can be dismissed.
- **FACT:** Questionable results are escalated to an attorney.
- **FACT:** Maria does not make the final determination that an actual legal conflict exists.
- **CONSTRAINT:** Human judgment is an intentional part of the current conflict-review process.

### Attorney assignment

- **FACT:** After the conflict process permits intake to continue, Maria determines which attorney should review the prospective matter.
- **FACT:** Practice area is an important factor in attorney assignment.
- **FACT:** Attorney assignment is not automatically determined by Clio.
- **FACT:** The firm has an internal rotation or process for determining who is accepting consultations.
- **FACT:** Part of that process exists as institutional knowledge among staff.
- **FACT:** A small Excel spreadsheet stored in SharePoint contains information about which attorneys are taking new consultations and which attorneys are unavailable.
- **FACT:** Maria stated that the spreadsheet is not always current.
- **FACT:** When she is unsure, Maria may contact someone through Microsoft Teams to determine who should receive the matter.

### Handoff and post-handoff status

- **FACT:** Maria assigns the prospective matter to the appropriate attorney and creates a Clio task requesting review.
- **FACT:** Depending on the attorney or practice group, Maria may also send an email or Teams message.
- **FACT:** Maria stated that some attorneys are better than others about monitoring their Clio tasks.
- **FACT:** The attorney decides whether to schedule a consultation, request additional information, or decline the potential matter.
- **FACT:** The expected process is for the prospective matter to be updated in Clio.
- **FACT:** Maria reported that this update does not happen consistently.
- **FACT:** Maria sometimes has to investigate status manually when a prospective client calls asking what is happening.
- **FACT:** That investigation may involve contacting the attorney or the attorney's assistant.

## Phone intake differences

- **FACT:** The phone workflow is substantially similar to the website workflow after information has been entered into Clio.
- **FACT:** The primary difference is how the initial information is captured.
- **FACT:** Reception may transfer prospective-client calls to intake staff.
- **FACT:** Maria speaks with the caller and collects information such as contact information, the nature of the legal issue, and other people or organizations involved.
- **FACT:** Maria may enter information directly into Clio while speaking with the caller.
- **FACT:** If the conversation is complicated or moving quickly, Maria may take notes first and enter the information into Clio afterward.
- **FACT:** If the prospective client has supporting documents, Maria asks the person to email them to the shared intake mailbox.
- **FACT:** Separately received documents must then be associated with the prospective client or intake Maria was handling.
- **OBSERVATION:** Website intake and phone intake converge once sufficient information has been entered into Clio, but their information-capture mechanisms differ.

The converged sequence described during the interview is:

1. Prospective client or matter entered in Clio.
2. Relevant parties identified.
3. Conflict search performed.
4. Possible conflicts reviewed and, when appropriate, escalated.
5. Attorney determined.
6. Prospective matter assigned.
7. Review task created.
8. Attorney review performed.

This sequence records the described workflow; it is not a product specification.

## Stakeholder-identified pain points

- **FACT:** Duplicate effort can occur when multiple intake employees begin processing the same shared-mailbox inquiry.
- **FACT:** An inquiry can remain unclaimed longer than intended.
- **FACT:** Website information must be manually transferred from Outlook into Clio.
- **FACT:** Manual data entry has produced transcription errors.
- **FACT:** Duplicate Clio contacts can be created.
- **FACT:** Relevant parties may be buried inside submitted documents.
- **FACT:** Parties have sometimes been omitted from the initial conflict search and discovered later.
- **FACT:** Attorney-assignment information is distributed between institutional knowledge, a SharePoint spreadsheet, and Teams conversations.
- **FACT:** The attorney-availability spreadsheet is not always current.
- **FACT:** Clio tasks do not always produce a reliable operational handoff because some attorneys monitor them more consistently than others.
- **FACT:** Post-handoff status is not always reflected in Clio, requiring intake staff to investigate manually when prospective clients ask for updates.

## Stakeholder-requested improvements

- **FACT:** Maria would like to avoid manually entering website information into Clio when that information has already been supplied electronically.
- **FACT:** Maria said it would be useful if something could review submitted material and identify names that might need to be included in the conflict search.
- **CONSTRAINT:** Maria would not want software to decide the conflict result.
- **FACT:** Maria would want to review suggested parties and decide whether they belong in the search.
- **FACT:** Documents may mention people who are unrelated to the conflict analysis.

These statements record Maria's requested improvements and boundaries. They are not finalized requirements or selected features.

## Direct observations

- **OBSERVATION:** The website workflow contains repeated context switching among Outlook, submitted documents, and Clio.
- **OBSERVATION:** Several workflow transitions are coordinated outside the primary matter-management system.
- **OBSERVATION:** Staff have developed compensating processes around workflow gaps, including Outlook categories, the Processed folder, the attorney-availability spreadsheet, Teams messages, and supplemental email notifications.
- **OBSERVATION:** The official Clio task handoff is sometimes supplemented by other communication channels because staff do not consider task monitoring equally reliable across attorneys.
- **OBSERVATION:** Website intake and phone intake converge once sufficient information has been entered into Clio, but their information-capture mechanisms differ.

## Hypotheses requiring validation

- **HYPOTHESIS:** Reducing duplicate data entry between website intake and Clio could reduce both staff effort and transcription errors.
- **HYPOTHESIS:** Explicit ownership or assignment of new inquiries may reduce duplicate processing and delayed responses.
- **HYPOTHESIS:** Assisted extraction of potential party names from submitted documents could reduce the likelihood that relevant parties are omitted from an initial conflict search.
- **HYPOTHESIS:** The attorney-assignment process may depend too heavily on information outside Clio and on institutional knowledge.
- **HYPOTHESIS:** Post-handoff status visibility may be insufficient for intake staff who need to respond to prospective-client inquiries.

These hypotheses have not been validated and must not be treated as requirements.

## Conflict-review boundary

- **CONSTRAINT:** Human involvement in conflict review must not be characterized as inherently inefficient.
- **FACT:** Name matches can be ambiguous.
- **FACT:** A matching name does not necessarily constitute a legal conflict.
- **FACT:** Documents can contain names unrelated to conflict analysis.
- **FACT:** Questionable results require attorney review.
- **CONSTRAINT:** Maria explicitly does not want software making the conflict decision.
- **OPEN QUESTION:** Where, if anywhere, could information collection or retrieval be assisted without making substantive conflict decisions?

## Open questions

- **OPEN QUESTION:** What website platform or form technology currently generates intake submissions?
- **OPEN QUESTION:** Does the website have any existing Clio integration capability?
- **OPEN QUESTION:** What Clio APIs or integration capabilities are available under the firm's current account and configuration?
- **OPEN QUESTION:** How much time does a typical website intake require?
- **OPEN QUESTION:** How many website and phone inquiries does the firm receive per day, week, and month?
- **OPEN QUESTION:** How frequently do transcription errors occur?
- **OPEN QUESTION:** How frequently are duplicate contacts created?
- **OPEN QUESTION:** How frequently are additional parties discovered after the initial conflict search?
- **OPEN QUESTION:** What are the consequences when an intake remains unclaimed for too long?
- **OPEN QUESTION:** Who owns and maintains the attorney-availability spreadsheet?
- **OPEN QUESTION:** What determines the attorney rotation beyond practice area and availability?
- **OPEN QUESTION:** Why does the attorney-availability spreadsheet become outdated?
- **OPEN QUESTION:** How frequently are supplemental email or Teams notifications required after a Clio task is created?
- **OPEN QUESTION:** How frequently does intake have to investigate post-handoff status manually?
- **OPEN QUESTION:** Do different practice groups follow materially different intake or attorney-assignment processes?
- **OPEN QUESTION:** What information is required before an intake is considered complete enough for attorney review?
- **OPEN QUESTION:** What audit or history capabilities already exist in Clio for prospective-client intake?

## Cross-interview context

Discovery Interview 001 with Rachel Morgan, Director of Legal Operations, established the following:

- **FACT:** Clio is the firm's established matter-management platform and is staying.
- **FACT:** Microsoft 365 and Outlook are major locations where daily work occurs.
- **FACT:** Information is not consistently returned to Clio.
- **CONSTRAINT:** The firm does not want another independently maintained system of record.
- **FACT:** Intake, active-matter status, and deadlines and follow-up were identified as recurring areas of concern.
- **OBSERVATION:** Maria's interview provides frontline evidence consistent with some of Rachel's higher-level observations, particularly operational friction between Outlook or Microsoft 365 and Clio.
- **CONSTRAINT:** Agreement between these two stakeholders must not be treated as proof that every practice group or employee follows the same process.

## Discovery status

- **CONSTRAINT:** No MVP has been selected.
- **CONSTRAINT:** No technical architecture has been selected.
- **CONSTRAINT:** No AI model or provider has been selected.
- **CONSTRAINT:** No product requirements have been finalized.
- **CONSTRAINT:** No decision has been made that the intake workflow will be part of the MVP.
- **FACT:** The purpose of this interview was workflow discovery and evidence gathering.
