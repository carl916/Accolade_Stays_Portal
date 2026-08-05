# Accolade Stays Operations App

## Product purpose

This is a mobile-first cleaning operations application for Accolade Stays.

It replaces WhatsApp-based cleaning coordination and provides a reliable operational record for:

- clean creation and approval
- cleaner assignment and acceptance
- current and required bed configurations
- clean start and completion times
- dirty linen reporting
- clean linen used
- unusually long clean reporting
- supporting notes and photographs

The initial properties are:

- St Andrews
- Brahms
- Rossini

## Users and roles

There are three roles:

### Administrator

The administrator can:

- create and edit cleaning jobs
- view every property and clean
- define the required bed configuration
- view job progress
- review linen reports and exceptions
- manage users, properties and settings

### Cleaning manager

The initial cleaning manager is Beverley.

The cleaning manager can:

- approve proposed cleaning jobs
- amend instructions
- assign and reassign cleaners
- see all cleaning jobs
- review linen reports
- review long-clean exceptions

### Cleaner

A cleaner can:

- view only jobs assigned to them
- accept or decline a job
- see bed setup instructions
- start a clean
- report a setup that differs from the recorded current configuration
- complete a clean
- record dirty linen
- confirm clean linen used
- explain unusually long cleans
- upload supporting photographs

Cleaners must not see other cleaners' jobs or administrative settings.

## Core workflow

A cleaning job progresses through:

1. Awaiting approval
2. Awaiting cleaner response
3. Accepted
4. In progress
5. Completed
6. Requires review
7. Cancelled

Every status change must create an audit event.

## Bed configuration

Bed configuration is a core feature.

Each bedroom has:

- a physical bed type
- permitted configurations
- a current confirmed configuration
- the date and user that last confirmed it

Examples of physical bed types:

- zip and link
- fixed double
- fixed single
- other

Examples of configurations:

- king
- double
- two singles
- single
- unmade
- other
- unknown

Each cleaning job stores a snapshot of:

- assumed current configuration
- required configuration
- actual configuration found, if different
- final configuration left by the cleaner

The cleaner must clearly see the change required, for example:

Current: King
Required: Two singles
Action: Split bed

Completing a clean updates the property's current configuration to the final confirmed configuration.

If the final configuration differs from the required configuration:

- a reason is mandatory
- the job becomes Requires Review

## Linen reporting

A standard changeover cannot be completed without dirty linen quantities.

Track initially:

- king duvet covers
- double duvet covers
- single duvet covers
- king fitted sheets
- double fitted sheets
- single fitted sheets
- pillowcases
- bath towels
- hand towels
- bath mats
- tea towels

The app should suggest clean linen quantities from the required bed configuration.

The cleaner confirms or amends the suggested quantities.

Do not ask cleaners to calculate cupboard stock or laundry balances.

## Long cleans

The system records start and completion timestamps.

A job is unusually long if it exceeds its expected duration by more than 60 minutes.

When unusually long, the cleaner must select a reason before completing.

Reasons include:

- property exceptionally dirty
- excessive rubbish
- guest departure delay
- access delay
- additional beds required
- linen problem
- damage or maintenance issue
- missing supplies
- cleaner interruption
- other

Notes and photographs can be added.

## Scope exclusions

Do not add these unless specifically requested:

- Smoobu integration
- booking imports
- invoicing
- bookkeeping
- cleaner payments
- consumables
- shopping lists
- guest communications
- lost property
- GPS tracking
- QR codes
- advanced analytics
- automated rota planning

## Technical requirements

Use:

- Next.js App Router
- TypeScript
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Tailwind CSS
- shadcn/ui where appropriate
- Zod validation

Use server components by default.

Use client components only when interactivity requires them.

Never expose the Supabase service-role key to the browser.

All database tables must have Row Level Security enabled.

Database changes must be written as SQL migrations in `supabase/migrations`.

Generate TypeScript database types from the schema or maintain an equivalent strongly typed database definition.

## Interface requirements

The app must be mobile-first.

Cleaner actions must be usable on a typical Android phone.

Use large touch targets.

Avoid wide tables on cleaner-facing screens.

Minimise typing.

Prefer buttons, selectors, presets and plus/minus quantity controls.

Every page must clearly show:

- property
- date
- current status
- next action

Routine completion should take approximately two minutes.

## Quality requirements

Before completing a task, run:

- npm run lint
- npm run typecheck
- npm run test
- npm run build

Do not claim a task is complete if any of these fail.

Add tests for important workflow and permission rules.

Do not make unrelated changes.

Do not silently change the product requirements.

When requirements are unclear, document the assumption in the task summary.