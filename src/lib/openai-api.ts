import { AUTH_ENABLED } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface AIRequestOptions {
  prompt?: string;
  messages?: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  conversationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Json | null;
}

export async function callAI(options: AIRequestOptions): Promise<string> {
  if (!AUTH_ENABLED) {
    throw new Error("Backend AI calls require auth to be enabled.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to call the AI backend");
  }

  const { data, error } = await supabase.functions.invoke("generate-gpt-basic", {
    body: {
      prompt: options.prompt,
      messages: options.messages,
      model: options.model,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      conversation_id: options.conversationId,
      entity_type: options.entityType,
      entity_id: options.entityId,
      metadata: options.metadata,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.content) {
    throw new Error("No content returned from AI backend");
  }

  return data.content;
}
