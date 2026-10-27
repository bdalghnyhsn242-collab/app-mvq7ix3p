# Authentication

Authentication is present but optional. The starter runs in guest mode unless this env var is set:

```bash
VITE_AUTH_ENABLED=true
```

When auth is disabled, protected layout routes render with a guest session and settings are stored in localStorage. This lets a developer build the first version of an app without configuring Supabase.

When auth is enabled, the starter uses Supabase Auth and keeps app session state in `src/context/AuthContext.tsx`.

Routes:

- `/auth` renders `src/components/auth/AuthForm.tsx`.
- `/reset-password` renders `src/pages/ResetPasswordPage.tsx`.
- Protected pages use `src/components/layout/AppLayout.tsx`, which redirects unauthenticated users to `/auth` only when auth is enabled.

Supported defaults:

- Email/password sign up and sign in.
- Password reset email with redirect to `/reset-password`.
- Magic link sign in.
OAuth providers are intentionally not included in the default UI. Add provider buttons only when the product needs them.

The Supabase client is configured in `src/integrations/supabase/client.ts` and reads:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The auth boundary lives in:

- `src/config/features.ts`
- `src/App.tsx`
- `src/context/AuthContext.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/auth/AuthForm.tsx`

The migration creates a `profiles` table and an `auth.users` trigger that inserts a profile row for new users.
