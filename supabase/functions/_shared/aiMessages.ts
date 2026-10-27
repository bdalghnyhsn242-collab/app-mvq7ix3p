import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AIMessageRole = "user" | "assistant" | "system" | "tool";
export type AIMessageType =
  | "user_message"
  | "assistant_message"
  | "tool_call"
  | "tool_result"
  | "system_event";

export type StoreAIMessageOptions = {
  userId: string;
  message: string;
  messageType: AIMessageType;
  role?: AIMessageRole;
  conversationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  parentMessageId?: string | null;
  metadata?: unknown;
};

function inferRole(messageType: AIMessageType): AIMessageRole {
  switch (messageType) {
    case "user_message":
      return "user";
    case "assistant_message":
      return "assistant";
    case "tool_call":
    case "tool_result":
      return "tool";
    case "system_event":
      return "system";
  }
}

export async function storeAIMessage(
  supabase: SupabaseClient,
  {
    userId,
    message,
    messageType,
    role,
    conversationId,
    entityType,
    entityId,
    parentMessageId,
    metadata,
  }: StoreAIMessageOptions,
) {
  const { data, error, status } = await supabase
    .from("ai_messages")
    .insert({
      user_id: userId,
      conversation_id: conversationId ?? null,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      parent_message_id: parentMessageId ?? null,
      role: role ?? inferRole(messageType),
      message_type: messageType,
      message,
      metadata: metadata ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store AI message (status ${status}): ${error.message}`);
  }

  return data;
}
