import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/integrations/supabase/types";

export type AIMessage = Tables<"ai_messages">;

export type AIMessageRole = AIMessage["role"];
export type AIMessageType = AIMessage["message_type"];

export interface StoreAIMessageOptions {
  userId: string;
  message: string;
  messageType: AIMessageType;
  role?: AIMessageRole;
  conversationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  parentMessageId?: string | null;
  metadata?: Json | null;
}

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
  supabaseClient: SupabaseClient<Database>,
  {
    userId,
    conversationId,
    entityType,
    entityId,
    parentMessageId,
    message,
    messageType,
    role,
    metadata,
  }: StoreAIMessageOptions,
): Promise<PostgrestSingleResponse<AIMessage>> {
  const response = await supabaseClient
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

  if (response.error) {
    console.error("Error inserting ai_message:", response.error);
    throw new Error(
      `Failed to store AI message (status ${response.status}): ${response.error.message}`,
    );
  }

  return response;
}
