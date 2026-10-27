import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { storeAIMessage } from "../_shared/aiMessages.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest } from "../_shared/db.ts";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

type RequestBody = {
  prompt?: string;
  messages?: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  conversation_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: unknown;
};

function normalizeMessages(body: RequestBody): ChatMessage[] {
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return body.messages;
  }

  if (body.prompt?.trim()) {
    return [{ role: "user", content: body.prompt.trim() }];
  }

  throw new Error("prompt or messages are required");
}

async function callOpenAI({
  messages,
  model,
  temperature,
  maxTokens,
}: {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.2,
      max_tokens: maxTokens ?? 1200,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return String(data.choices?.[0]?.message?.content ?? "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { supabase, user } = await getUserFromRequest(req);
    const body = (await req.json()) as RequestBody;
    const messages = normalizeMessages(body);
    const model = body.model || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

    if (lastUserMessage) {
      await storeAIMessage(supabase, {
        userId: user.id,
        conversationId: body.conversation_id ?? null,
        entityType: body.entity_type ?? null,
        entityId: body.entity_id ?? null,
        messageType: "user_message",
        message: lastUserMessage.content,
        metadata: body.metadata ?? null,
      });
    }

    const content = await callOpenAI({
      messages,
      model,
      temperature: body.temperature,
      maxTokens: body.max_tokens,
    });

    await storeAIMessage(supabase, {
      userId: user.id,
      conversationId: body.conversation_id ?? null,
      entityType: body.entity_type ?? null,
      entityId: body.entity_id ?? null,
      messageType: "assistant_message",
      message: content,
      metadata: {
        model,
        source: "generate-gpt-basic",
      },
    });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    const status = /authorization/i.test(message) ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
