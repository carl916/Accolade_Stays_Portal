# Accolade Stays Operations Portal

Mobile-first operations portal for Accolade Stays cleaning coordination.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the required values.

3. Start the development server:

   ```bash
   npm run dev
   ```

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL used by browser and server clients.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key used by browser and server clients.
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only Supabase service-role key. Never expose this to client components or browser code.
- `NEXT_PUBLIC_APP_ENV`: App environment label. Use `Production` for production deployments; any other value displays an environment banner.

## Development Commands

- `npm run dev`: Start the local Next.js development server.
- `npm run build`: Create a production build.
- `npm run lint`: Run ESLint.
- `npm run typecheck`: Run TypeScript without emitting files.
- `npm run test`: Run the Vitest test suite.

## Database Setup

Database changes live in `supabase/migrations`.

Apply migrations to staging first, verify the app, then apply the same migration set to production. The initial schema creates the core operations tables, enables Row Level Security on every table, seeds the three initial properties, and records audit events whenever a cleaning job status is created or changed.

The first administrator profile must be bootstrapped through a trusted server-side process or the Supabase dashboard. After that, administrators can manage user roles through the application workflows that will be added later.

## Authentication

The login flow uses Supabase email/password authentication. A user must exist in Supabase Auth and have a matching active row in `public.profiles` before they can access the portal.

Role routing sends users to:

- `administrator`: `/admin`
- `cleaning_manager`: `/manager`
- `cleaner`: `/cleaner`

## Deployment Approach

Deploy as a standard Next.js App Router application. Configure the environment variables in the hosting platform, use `NEXT_PUBLIC_APP_ENV=Production` for the production environment, and keep `SUPABASE_SERVICE_ROLE_KEY` restricted to server-side runtime configuration only.

Apply database migrations before deploying application features that depend on new tables or policies.
