# Trigger.dev

Trigger.dev is included as the preferred path for durable background AI work.

Core files:

- `trigger.config.ts`
- `src/trigger/generate-with-ai.ts`
- `src/context/TriggerContext.tsx`
- `src/hooks/useTriggerToken.ts`
- `supabase/functions/trigger-token/index.ts`

Local development:

```bash
npm run trigger:dev
```

Deployment:

```bash
npm run trigger:deploy
```

Set `TRIGGER_PROJECT_REF` for `trigger.config.ts` and `TRIGGER_SECRET_KEY` for the token Edge Function.

When a backend call starts a Trigger.dev run, pass the run id and public access token to `addRunSubscription(runId, accessToken)` so React can track active work.

Trigger realtime token fetching is disabled in guest mode. Enable auth before wiring user-scoped Trigger.dev realtime updates.
