# Template Documentation

This folder documents the reusable primitives in the application base.

Use `docs/internal implementation/` for deeper implementation guides tied to framework features. When a feature changes, update the matching guide in the same change.

## Default routing

The scaffold defines `/` as the primary application entry point. Apps built from this scaffold should replace `src/pages/HomePage.tsx` with the main experience for that app, whether that is a dashboard, full-screen tool, editor, landing page, or other single-page interface.

The scaffold includes `/settings`, authentication, password reset, and not-found routes as reusable starting points. It does not include a default `/dashboard` route or redirect because many apps need to own `/` directly.

If the app should open on a dashboard, build that dashboard in `HomePage.tsx` or add a dashboard route intentionally in `src/App.tsx`. If the app should be a single-screen tool, replace `HomePage.tsx` with that primary experience and leave `/` as the main route.

Authentication is intentionally optional. Start in guest mode, then set `VITE_AUTH_ENABLED=true` and configure Supabase when the app needs accounts.
