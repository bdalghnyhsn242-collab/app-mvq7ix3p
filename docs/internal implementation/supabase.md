# Supabase

Supabase is the default backend once backend features are enabled. The starter can run without Supabase while `VITE_AUTH_ENABLED=false`.

Core files:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `supabase/migrations/20260503000000_initial_template.sql`
- `supabase/functions/_shared/`

Regenerate database types after schema changes:

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

Local function serving:

```bash
npm run dev:fx
```

Secure user settings go through `supabase/functions/save-user-setting/index.ts`, which encrypts keys matching `api_key`, `token`, `access_key`, `secret`, or `password` when `ENCRYPTION_SECRET` is set.
