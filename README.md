# LatchLoop App Base

Reusable React + Vite application base for small LatchLoop web apps.

## Stack

- React, TypeScript, Vite, and React Router.
- Tailwind CSS with shadcn/Radix-style UI primitives and `lucide-react` icons.
- Optional Supabase auth, database, Realtime, and Edge Functions.
- Sonner for toast notifications.
- React Hook Form and Zod for validated forms.
- Trigger.dev scaffolding for durable background AI work.
- Vercel SPA fallback configuration.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The starter runs in guest mode by default so a new app can be explored before Supabase is configured.

Turn on Supabase-backed auth when the app needs accounts:

```bash
VITE_AUTH_ENABLED=true
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

For Supabase Edge Functions, configure server-side env vars in Supabase:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
TRIGGER_SECRET_KEY=
ENCRYPTION_SECRET=
```

## Project Structure

```text
src/
  components/ui/        Reusable UI primitives
  components/auth/      Supabase auth form, enabled by feature flag
  components/ai/        AI message display and composer primitives
  components/layout/    App shell and account menu
  context/              Auth, settings, and Trigger providers
  hooks/                Reusable app hooks
  integrations/         Supabase client and generated database types
  lib/                  API helpers and shared utilities
  pages/                Starter route pages
  trigger/              Trigger.dev tasks
supabase/
  functions/            Edge Functions
  migrations/           Base schema and RLS
docs/
  internal implementation/
```

`docs/internal implementation/` contains deeper implementation guides. Update those docs whenever the corresponding primitive changes.

## Extending The Starter

1. Replace `src/pages/HomePage.tsx` with the first real app screen for `/`.
2. Add any additional routes in `src/App.tsx`.
3. Put reusable shell-level UI in `src/components/layout/` and app-specific UI near the feature that owns it.
4. Turn on auth with `VITE_AUTH_ENABLED=true` only when accounts are needed.
5. Add product tables through Supabase migrations, then regenerate `src/integrations/supabase/types.ts`.
6. Use `docs/internal implementation/` for deeper notes on auth, Supabase, AI messages, Trigger.dev, and deployment.

## Routing

`/` is the primary application route and renders `src/pages/HomePage.tsx`. The starter does not register or redirect to `/dashboard` by default, so new apps can own the root path without deleting dashboard-specific scaffolding first.

If an app needs a dashboard, add it intentionally as a normal route in `src/App.tsx` and link to it from `src/components/layout/AppLayout.tsx`.

## Validation Checklist

- `npm install`
- `npm run dev`
- `npm run build`
- Auth routes load without product-specific dependencies when `VITE_AUTH_ENABLED=true`.
- Supabase credentials come from environment variables.
- `ai_messages` helpers compile without task/project modules.
- `vercel.json` keeps SPA fallback routing.
