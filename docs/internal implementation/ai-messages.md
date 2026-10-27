# AI Messages

The reusable AI message primitive is centered on `public.ai_messages`.

The table is intentionally generalized:

- `conversation_id` groups free-form conversations.
- `entity_type` and `entity_id` scope messages to product-specific parent records without requiring template tables such as tasks or projects.
- `role` supports `user`, `assistant`, `system`, and `tool`.
- `message_type` supports `user_message`, `assistant_message`, `tool_call`, `tool_result`, and `system_event`.
- `metadata` stores provider, token, tool, run, and UI-specific details.

Frontend helpers:

- `src/lib/aiMessages.ts`
- `src/hooks/useAiMessages.ts`
- `src/components/ai/AIMessageList.tsx`
- `src/components/ai/AIMessageComposer.tsx`

Backend helper:

- `supabase/functions/_shared/aiMessages.ts`

Browser code should not call model providers directly. Use `src/lib/openai-api.ts`, which invokes the `generate-gpt-basic` Edge Function.

In guest mode (`VITE_AUTH_ENABLED=false`), AI persistence is paused because messages are user-scoped and protected by RLS. Enable auth before relying on persisted backend AI calls.
