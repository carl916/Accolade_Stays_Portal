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

## Deployment Approach

Deploy as a standard Next.js App Router application. Configure the environment variables in the hosting platform, use `NEXT_PUBLIC_APP_ENV=Production` for the production environment, and keep `SUPABASE_SERVICE_ROLE_KEY` restricted to server-side runtime configuration only.

Database schema and Supabase Row Level Security policies will be added later through SQL migrations in `supabase/migrations`.
