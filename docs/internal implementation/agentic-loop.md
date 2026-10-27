# Agentic Loop

The template keeps a small agent-loop skeleton in `src/lib/ai/agentLoop.ts`.

Recommended durable loop shape:

1. Receive the user request in a browser route or Edge Function.
2. Persist the user turn to `ai_messages`.
3. Load relevant app context from Supabase.
4. Call the server-side model function.
5. Execute only allowed tools.
6. Persist tool calls, tool results, system events, and assistant turns.
7. Stream or poll status back to the client.
8. Persist a durable final assistant message.

Keep provider keys server-side. Browser components should call Supabase Edge Functions or Trigger.dev tasks, never provider APIs directly.

For long-running loops, prefer Trigger.dev tasks in `src/trigger/` over a single Edge Function request.
