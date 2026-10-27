# Vercel Deployment

The starter includes `vercel.json` with an SPA fallback:

```json
{
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

Future apps should prefer Supabase Edge Functions for backend work. Keep Vercel serverless functions optional and feature-specific.

Required Vercel environment variables for the client build:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_NAME=
```

Server-only secrets such as `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ENCRYPTION_SECRET` belong in Supabase or Trigger.dev environment configuration, not the Vite client.
