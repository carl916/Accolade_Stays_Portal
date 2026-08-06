# Accolade Stays Operations Portal

## MVP Specification

## 1. Purpose

The Accolade Stays Operations Portal is a mobile-first cleaning operations application.

The MVP will replace informal WhatsApp-based cleaning coordination with a structured workflow that provides a reliable record of:

- planned cleans
- approval and cleaner assignment
- cleaner acceptance or decline
- current and required bed configurations
- clean start and completion times
- dirty linen quantities
- clean linen used
- unusually long cleans
- supporting notes and photographs

The MVP must solve these immediate operational problems:

1. Cleans being missed, duplicated or confused.
2. Cleaners feeling pressured to respond to WhatsApp messages outside working hours.
3. Dirty linen quantities being reported late or inaccurately.
4. No reliable record of how beds are currently configured.
5. No reliable way to communicate how beds must be configured for the next stay.
6. Exceptionally long cleans not being identified or explained promptly.

The MVP will not attempt to manage the entire serviced accommodation business.

---

## 2. Product Principles

The application must be:

- mobile-first
- suitable for typical Android phones
- simple enough for cleaners to use without training
- faster than using multiple WhatsApp messages
- clear about who needs to act next
- designed around exceptions rather than constant messaging
- easy to extend later without rebuilding the core system
- structured to minimise typing

Routine actions should use:

- clear buttons
- predefined options
- quantity selectors
- saved property templates
- sensible default values

A cleaner should normally be able to complete the end-of-clean process in approximately two minutes.

---

## 3. Initial Properties

The MVP will initially support:

- St Andrews
- Brahms
- Rossini

Administrators must be able to add, edit and deactivate properties.

---

## 4. User Roles

### 4.1 Administrator

The Administrator represents Accolade Stays.

The Administrator can:

- create cleaning jobs
- edit cleaning jobs before completion
- select the property
- set the cleaning date and expected start time
- set the guest arrival deadline where relevant
- define the required bed configuration
- add instructions
- view all jobs
- view job status and activity
- view completed cleaning reports
- view dirty linen quantities
- view clean linen used
- view current property bed configurations
- review unusually long cleans
- review notes and photographs
- manage properties
- manage bedrooms
- manage users
- manage linen item types
- correct records where permitted
- review the audit trail

### 4.2 Cleaning Manager

The initial Cleaning Manager will be Beverley.

The Cleaning Manager can:

- view jobs awaiting approval
- approve or reject proposed jobs
- request or make changes before approval
- assign a cleaner
- change the assigned cleaner
- add or amend instructions
- view the cleaning schedule
- view completed cleans
- review dirty linen quantities
- review clean linen used
- review bed configuration differences
- review unusually long cleans
- add comments
- correct linen quantities where permitted

### 4.3 Cleaner

A Cleaner can:

- view jobs assigned to them
- see the property, date and time
- see the guest arrival deadline where relevant
- see the assumed current bed configuration
- see the required bed configuration
- see the action required for each bedroom
- accept or decline a job
- start the clean
- confirm or correct the configuration found on arrival
- complete the clean
- confirm the final bed configuration
- record dirty linen quantities
- confirm clean linen used
- report an unusually long clean
- report an issue during a clean
- add notes
- upload supporting photographs
- view their own upcoming and completed jobs

Cleaners must not have access to:

- financial information
- administrative settings
- jobs assigned to other cleaners
- records relating to other cleaners unless specifically permitted

---

## 5. Core Cleaning Workflow

### Stage 1: Clean Created

The Administrator creates a cleaning job.

Required information:

- property
- cleaning date
- expected start time or time window
- guest arrival deadline, where relevant
- required bed configuration
- cleaning type
- expected duration

Optional information:

- instructions
- notes

Initial cleaning types:

- Standard changeover
- Mid-stay clean
- Deep or remedial clean
- Other

The new job status is:

`awaiting_approval`

### Stage 2: Cleaning Manager Approval

The job appears in Beverley’s list of jobs awaiting approval.

Beverley can:

- approve the job
- edit operational details
- assign a cleaner
- reject the job
- return the job for correction

When approved and assigned, the status becomes:

`awaiting_cleaner_response`

### Stage 3: Cleaner Acceptance

The assigned cleaner sees the job in the app.

The cleaner can:

- accept
- decline
- view the job details

The application records:

- when the job was assigned
- when the cleaner viewed it
- when the cleaner accepted or declined it

If accepted, the status becomes:

`accepted`

If declined, the job returns to the Cleaning Manager for reassignment.

The decline remains visible in the audit timeline.

### Stage 4: Cleaner Starts the Job

The cleaner presses:

`Start clean`

The application records:

- actual start time
- user
- property
- job reference

The status becomes:

`in_progress`

The cleaner must not be required to complete a long form before starting.

### Stage 5: Arrival Bed Configuration Check

The cleaner sees the bed configuration recorded by the application.

For each bedroom, the cleaner can confirm:

- Matches app
- Setup differs from app

If the current configuration is unknown, the cleaner must record the configuration found.

If the setup differs, the cleaner records the actual configuration found.

The application must then recalculate and display the action required.

Example:

- Assumed current: King
- Actual found: Two singles
- Required: King
- Action: Join beds

The application must preserve the difference between:

- assumed current configuration
- actual configuration found
- required configuration
- final configuration left

### Stage 6: Cleaner Completes the Job

The cleaner presses:

`Complete clean`

Before submission, the cleaner must:

1. confirm the final bed configuration
2. record dirty linen quantities
3. confirm or amend clean linen used
4. confirm whether there were any issues
5. provide a long-clean explanation where required
6. add any required notes
7. optionally upload supporting photographs

The application records the completion time automatically.

If the final bed setup matches the required setup and there are no unresolved exceptions, the status becomes:

`completed`

If the final setup differs from the required setup, or another issue requires review, the status becomes:

`requires_review`

### Stage 7: Completed or Requires Review

The Administrator and Cleaning Manager can view:

- property
- cleaner
- start time
- finish time
- total duration
- assumed current bed setup
- actual setup found
- required setup
- final setup left
- dirty linen quantities
- clean linen used
- notes
- photographs
- exception flags
- audit history

---

## 6. Cleaning Job Statuses

The MVP will use these statuses:

- `awaiting_approval`
- `awaiting_cleaner_response`
- `accepted`
- `in_progress`
- `completed`
- `requires_review`
- `cancelled`

The current status must be shown clearly on every job.

Every status change must create an audit event showing:

- date and time
- user
- action
- previous status
- new status

---

## 7. Cleaning Schedule

The application must include a simple schedule with these views:

- Today
- Upcoming
- Calendar
- Completed
- Requires attention

Each job card should show:

- property
- date
- expected start time
- guest arrival deadline, where relevant
- cleaner
- status
- required bed configuration summary
- start time, once started
- duration, once completed

Status may be supported by colour, but must always also be shown as text.

---

## 8. Bed Configuration

Bed configuration is a core MVP feature.

The application must not treat bed configuration as a simple free-text instruction.

### 8.1 Bedroom Definition

Each property has one or more bedrooms.

Each bedroom must record:

- bedroom name or number
- physical bed type
- permitted configurations
- default configuration
- current confirmed configuration
- date last confirmed
- user who last confirmed it
- active status

Suggested physical bed types:

- Zip-and-link
- Fixed double
- Fixed single
- Other

Suggested permitted configurations:

- King
- Double
- Two singles
- Single
- Unmade
- Other
- Unknown

A bedroom’s current configuration must be one of its permitted configurations.

### 8.2 Current Configuration

The current configuration represents how the bedroom was left after the most recently confirmed clean.

At launch, current configurations may be recorded as:

`Unknown`

When the current configuration is unknown, the cleaner must record what they find on arrival.

### 8.3 Required Configuration

Each cleaning job must record the required configuration for every bedroom.

The required configuration must be selected from the bedroom’s permitted configurations.

### 8.4 Job Configuration Snapshot

Each cleaning job must preserve a snapshot of:

- assumed current configuration
- actual configuration found
- required configuration
- final configuration left

Historical job records must not change if the property or bedroom settings are edited later.

### 8.5 Action Required

The application must calculate and display the action required.

Examples:

- King to King: No change
- King to Two singles: Split bed
- Two singles to King: Join beds
- Unknown to King: Confirm current setup, then configure as King
- Unmade to Double: Make as double
- Double to Double: No change

The action required must be prominent on the cleaner’s job screen.

### 8.6 Completion and Current State

The cleaner must confirm the final configuration of every bedroom before completing a changeover.

When the clean is successfully submitted:

- the job retains its configuration snapshots
- the property’s current bedroom configuration is updated to the final confirmed configuration

This update must happen atomically with job completion.

If the final configuration differs from the required configuration:

- a reason is mandatory
- the job becomes `requires_review`
- the Administrator and Cleaning Manager are notified

---

## 9. Property Configuration Templates

Each property should have a saved bedroom template.

Example:

### St Andrews

- Bedroom 1: Zip-and-link
- Bedroom 2: Zip-and-link
- Bedroom 3: Fixed double

The application may provide optional booking setup presets such as:

- Three couples
- Two couples and two singles
- Maximum separate beds
- Previous configuration
- Custom

Presets only populate the bedroom selections.

The bedroom-by-bedroom configuration must remain visible and editable.

---

## 10. Linen Items

The MVP should initially track:

- King duvet covers
- Double duvet covers
- Single duvet covers
- King fitted sheets
- Double fitted sheets
- Single fitted sheets
- Pillowcases
- Bath towels
- Hand towels
- Bath mats
- Tea towels

The list must be configurable by an Administrator.

Unused items can be deactivated.

---

## 11. Dirty Linen Reporting

Dirty linen reporting is mandatory before a standard changeover can be completed.

For each linen type, the cleaner records the quantity removed.

The interface should use:

- minus button
- current quantity
- plus button
- numeric fallback input

The application should suggest expected dirty bed linen based on:

- the actual configuration found
- the required configuration
- the normal linen allocation

The cleaner must confirm or amend the quantities.

The application must not assume the suggested quantities are correct without cleaner confirmation.

The dirty linen report must be:

- linked to the cleaning job
- timestamped automatically
- attributed to the user
- included in the audit history
- editable only by authorised users

Cleaners should be able to save progress while completing the form.

---

## 12. Clean Linen Used

The cleaner must confirm the clean linen placed on beds.

The application should pre-populate expected bed linen based on the required final configuration.

Example:

If a room is required as two singles, the application may suggest:

- 2 single fitted sheets
- 2 single duvet covers
- 4 pillowcases

The cleaner can confirm or amend these quantities.

Towels must be entered separately because towel quantities may depend on guest numbers rather than bed configuration.

The cleaner must not be asked to calculate:

- cupboard stock
- laundry balances
- contract stock
- stock discrepancies

Their responsibility is limited to recording what they directly handled.

---

## 13. Long Clean Monitoring

The application must calculate clean duration from:

- `started_at`
- `completed_at`

Each property or job has an expected duration.

Recommended initial rule:

A clean is flagged as unusually long if it exceeds the expected duration by more than 60 minutes.

The tolerance must be configurable later.

The application should also identify a clean that remains in progress beyond the expected time before completion.

---

## 14. Long Clean Explanation

If a clean exceeds the long-clean threshold, the cleaner must select at least one reason before completion.

Suggested reasons:

- Property left exceptionally dirty
- Excessive rubbish
- Guest departure delay
- Access delay
- Additional beds required
- Linen problem
- Damage or maintenance issue
- Missing supplies
- Cleaner interruption
- Other

The cleaner can also:

- add a written note
- upload supporting photographs

Photographs should not be mandatory for routine cleans.

Evidence should only be requested for exceptions or reported problems.

---

## 15. Issue Reporting During a Clean

A cleaner should be able to report an issue before completing the job.

Suggested issue types:

- Property exceptionally dirty
- Excessive rubbish
- Access problem
- Damage
- Linen shortage
- Missing supplies
- Guest still present
- Other

The cleaner can:

- select an issue type
- add a note
- upload photographs

The Administrator and Cleaning Manager should be able to see the issue while the clean is still in progress.

---

## 16. Photographs

Photographs may be uploaded for:

- excessive dirt
- rubbish
- damage
- linen problems
- access issues
- other exceptional circumstances

MVP requirements:

- maximum 10 photographs per clean
- images compressed before upload where practical
- photographs timestamped
- photographs linked to the cleaning job
- photographs visible only to authorised users
- secure Supabase Storage policies

Routine before-and-after photographs are not mandatory.

---

## 17. Notifications

Notifications must support the workflow without recreating the pressure of WhatsApp.

The first release should use:

- in-app notifications
- optional email notifications

Push notifications are not required for the initial release.

### Cleaning Manager Notifications

Notify Beverley when:

- a clean is awaiting approval
- a cleaner declines a job
- a clean remains unaccepted
- a cleaner has not started on time
- a clean is in progress too long
- a clean is exceptionally long
- a final bed configuration differs from the requirement

### Cleaner Notifications

Notify the cleaner when:

- a job is assigned
- a job changes
- a job is cancelled
- a clean is due soon

### Administrator Notifications

Notify the Administrator when:

- a clean remains unapproved
- a job has not been accepted
- a clean is overdue
- a clean is completed
- a clean exceeds the duration threshold
- a bed configuration requires review

Notifications must be visible in an in-app notification centre.

---

## 18. Reminders and Attention Rules

The application should identify jobs requiring attention.

Initial rules:

- awaiting approval for more than 24 hours
- assigned but not accepted within a configurable period
- cleaner has not started by the expected start time
- clean has started but exceeded expected duration
- clean remains incomplete close to guest arrival
- mandatory linen report is missing
- final bed configuration differs from required
- arrival configuration differs from the recorded current setup

The dashboard should clearly show:

- Overdue
- Unaccepted
- In progress too long
- Missing information
- Requires review

---

## 19. Dashboards

### 19.1 Administrator Dashboard

Show:

- cleans today
- upcoming cleans
- awaiting approval
- unaccepted jobs
- cleans in progress
- overdue cleans
- long cleans requiring review
- bed configuration differences
- recently completed cleans
- recent activity

### 19.2 Cleaning Manager Dashboard

Show:

- jobs awaiting approval
- jobs requiring cleaner assignment
- declined jobs
- cleans today
- cleans in progress
- overdue jobs
- bed configuration issues
- exceptions requiring review

### 19.3 Cleaner Dashboard

Show:

- next assigned clean
- jobs requiring acceptance
- today’s jobs
- upcoming jobs
- in-progress job
- recently completed jobs

---

## 20. Minimum Screens

The first release should include:

1. Login
2. Role-based dashboard
3. Cleaning schedule
4. Cleaning job details and timeline
5. Create or edit cleaning job
6. Approve and assign clean
7. Cleaner acceptance screen
8. Start clean screen
9. Arrival bed configuration check
10. Complete clean flow
11. Dirty linen entry
12. Clean linen confirmation
13. Long-clean explanation
14. Issue reporting
15. Photograph upload
16. Property list
17. Property details
18. Bedroom setup
19. Notifications
20. User management
21. Basic settings

The completion flow may contain multiple steps without each step being a separate route.

---

## 21. Minimum Data Structure

### 21.1 Property

- id
- name
- address
- active
- default cleaning duration
- notes
- created at
- updated at

### 21.2 Bedroom

- id
- property id
- name
- physical bed type
- default configuration
- current confirmed configuration
- current configuration confirmed at
- current configuration confirmed by
- active
- created at
- updated at

### 21.3 Bedroom Permitted Configuration

- id
- bedroom id
- configuration
- active

### 21.4 User Profile

- id
- name
- email
- mobile number
- role
- active
- created at
- updated at

### 21.5 Cleaning Job

- id
- property id
- cleaning date
- expected start time
- guest arrival deadline
- expected duration
- cleaning type
- status
- cleaning manager id
- assigned cleaner id
- instructions
- notes
- created by
- created at
- approved at
- accepted at
- started at
- completed at
- actual duration
- long-clean flag
- requires review

### 21.6 Job Bedroom Configuration

- id
- job id
- bedroom id
- bedroom name snapshot
- physical bed type snapshot
- assumed current configuration
- actual configuration found
- required configuration
- final configuration left
- arrival difference reported
- completion status
- cleaner note
- created at
- updated at

### 21.7 Linen Item

- id
- name
- unit
- active
- display order

### 21.8 Cleaning Linen Record

- id
- job id
- linen item id
- expected dirty quantity
- dirty quantity
- expected clean quantity
- clean quantity used
- confirmed
- recorded by
- recorded at
- updated at

### 21.9 Cleaning Exception

- id
- job id
- exception type
- reason code
- description
- evidence required
- review status
- reviewed by
- reviewed at
- created at

### 21.10 Photograph

- id
- job id
- exception id
- storage path
- uploaded by
- uploaded at

### 21.11 Notification

- id
- user id
- job id
- notification type
- message
- read status
- created at

### 21.12 Audit Event

- id
- job id
- user id
- action
- previous value
- new value
- created at

---

## 22. Audit Trail

The application must maintain a permanent record of important actions.

Record:

- clean created
- clean edited
- clean approved
- cleaner assigned
- cleaner changed
- job accepted
- job declined
- clean started
- arrival bed setup confirmed
- arrival bed setup corrected
- clean completed
- final bed setup confirmed
- current property setup updated
- linen quantities submitted
- linen quantities amended
- exception created
- photograph uploaded
- exception reviewed
- job cancelled

Each record should show:

- date and time
- user
- action
- previous value where relevant
- new value where relevant

---

## 23. Security and Permissions

All user-facing database tables must have Row Level Security enabled.

Security must not rely only on hiding controls in the interface.

Requirements:

- Administrators can access all operational records.
- Cleaning Managers can access all cleaning operations records.
- Cleaners can only access jobs assigned to them.
- Cleaners cannot access jobs assigned to other cleaners.
- Cleaners cannot edit administrative settings.
- Cleaners cannot assign jobs.
- Cleaners cannot approve jobs.
- Cleaners cannot directly edit the property’s current bed configuration outside the assigned job workflow.
- Photograph access must follow the related job permissions.
- Supabase service-role credentials must never be exposed to browser code.
- Important workflow updates must be validated server-side.

---

## 24. Atomic Completion Requirement

Completing a clean must be treated as one reliable operation.

The completion operation must:

1. validate that the user is the assigned cleaner or an authorised manager
2. validate that the job is in progress
3. validate the final bedroom configuration
4. validate mandatory linen confirmation
5. validate long-clean reasons where required
6. save the final configuration snapshots
7. save linen quantities
8. save exceptions
9. calculate the actual duration
10. set the final job status
11. update the property’s current bedroom configurations
12. create audit events

The job completion and property current-configuration update must be atomic.

The application must not leave the job completed while the property configuration remains outdated.

---

## 25. Offline and Connectivity

Full offline support is not required for the first release.

The initial release may require internet access to:

- start a clean
- submit a completed clean

The completion form should preserve entered data during temporary signal interruptions where practical.

The interface should clearly show:

- saving
- saved
- submission failed
- retry required

The application must not show a clean as completed until the server confirms submission.

---

## 26. MVP Reports

The MVP does not need complex analytics.

It should provide:

### Cleaning Report

- property
- date
- cleaner
- status
- start time
- finish time
- duration
- exception status

### Bed Configuration Report

- property
- bedroom
- assumed current setup
- actual setup found
- required setup
- final setup
- difference status

### Linen Report

- property
- date
- linen item
- dirty quantity
- clean quantity used

### Long Clean Report

- property
- date
- cleaner
- expected duration
- actual duration
- reason
- notes
- photographs

CSV export is optional for the earliest release.

---

## 27. Features Excluded from the MVP

Do not develop these features in the initial release:

- Smoobu integration
- Airbnb integration
- Booking.com integration
- automatic booking imports
- invoicing
- cleaner payments
- bookkeeping
- consumables stock
- consumables shopping lists
- guest communications
- maintenance contractor management
- full damage management
- lost property management
- GPS tracking
- QR code check-in
- barcode scanning
- AI image analysis
- customer portal
- owner portal
- advanced analytics
- automated rota planning
- payroll
- accounting integrations
- full linen stock reconciliation
- laundry collection and return tracking

These may be added later without changing the core cleaning and bed-configuration workflow.

---

## 28. Future Phase: Linen Reconciliation

The database may be designed to support a future linen ledger, but the first release will not expose the full stock-reconciliation workflow.

A future phase may add:

- contract stock quantities
- target cupboard quantities
- minimum cupboard quantities
- physical cupboard counts
- laundry collected
- laundry returned
- linen location balances
- stock adjustments
- reconciliation screen
- variance alerts

Suggested future stock locations:

- Property cupboard
- In use
- Dirty
- Laundry

Cleaners should continue to record only:

- dirty linen removed
- clean linen used
- unusual linen movements

The Cleaning Manager or Administrator would record:

- laundry collections
- laundry returns
- physical cupboard counts
- stock adjustments

---

## 29. Acceptance Criteria

The MVP is successful when:

1. Every planned clean can be created and tracked in the app.
2. Beverley can approve and assign cleans without WhatsApp.
3. Cleaners can accept or decline jobs without direct messages.
4. Users can clearly see the current status of every relevant clean.
5. The cleaner can see the current and required bed setup.
6. The cleaner can see the action required for each bedroom.
7. Unknown bed configurations can be verified on arrival.
8. A setup that differs from the app can be corrected.
9. The final bed configuration is confirmed before completion.
10. The final confirmed setup becomes the property’s current setup.
11. Historical job configuration snapshots remain unchanged.
12. A standard changeover cannot be completed without confirmed dirty linen quantities.
13. Clean linen used is recorded against the job.
14. Start time, finish time and duration are recorded automatically.
15. Exceptionally long cleans are automatically flagged.
16. Cleaners can provide a reason, note and photographs for a long clean.
17. The Administrator can see overdue, unaccepted and unusually long cleans.
18. Bed configuration differences are clearly flagged.
19. All key actions are recorded in an audit trail.
20. The application works reliably on typical Android phones.
21. The normal cleaner completion process can be completed in approximately two minutes.

---

## 30. Recommended Technology

Use:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel
- Zod
- React Hook Form
- date-fns
- Vitest
- Playwright

The application should be a responsive web application or Progressive Web App.

A native Android application is not required for the MVP.

---

## 31. Implementation Sequence

Recommended build order:

### Phase 1: Foundation

- application scaffold
- Supabase client setup
- authentication
- user profiles
- role-based routing
- application shell
- Row Level Security

### Phase 2: Properties and Bedrooms

- property management
- bedroom setup
- physical bed types
- permitted configurations
- initial current configurations
- configuration history fields

### Phase 3: Cleaning Job Creation

- create clean
- required bed configuration
- assumed current configuration snapshots
- calculated action required
- approval
- cleaner assignment
- audit events

### Phase 4: Cleaner Workflow

- cleaner dashboard
- accept or decline
- job details
- start clean
- arrival configuration check
- issue reporting

### Phase 5: Completion

- final bed confirmation
- dirty linen reporting
- clean linen confirmation
- long-clean logic
- exceptions
- photographs
- atomic completion
- update property current configuration

### Phase 6: Operational Oversight

- dashboards
- attention rules
- notifications
- completed job reports
- review workflow
- end-to-end tests

---

## 32. Primary End-to-End Test

The principal end-to-end test must cover:

1. Administrator creates a clean.
2. Required bed configurations are selected.
3. Current property configurations are snapshotted.
4. Beverley approves and assigns the job.
5. Cleaner accepts the job.
6. Cleaner starts the clean.
7. Cleaner confirms or corrects the setup found.
8. The application recalculates required actions.
9. Cleaner confirms the final bed setup.
10. Cleaner records dirty linen.
11. Cleaner confirms clean linen used.
12. Long-clean information is required where applicable.
13. Cleaner completes the job.
14. The property’s current bed setup is updated.
15. The completed job retains its original snapshots.
16. The Administrator can review the completed job and audit history.
