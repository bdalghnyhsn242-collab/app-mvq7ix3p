import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_ENABLED } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import type { AIMessage } from "@/lib/aiMessages";

type UseAiMessagesOptions = {
  conversationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 50;

export function useAiMessages({
  conversationId,
  entityType,
  entityId,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseAiMessagesOptions) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const scopeKey = useMemo(
    () => `${conversationId ?? ""}:${entityType ?? ""}:${entityId ?? ""}`,
    [conversationId, entityType, entityId],
  );

  const buildQuery = useCallback(() => {
    let query = supabase.from("ai_messages").select("*", { count: "exact" });

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    } else {
      if (entityType) query = query.eq("entity_type", entityType);
      if (entityId) query = query.eq("entity_id", entityId);
    }

    return query.order("created_at", { ascending: false });
  }, [conversationId, entityType, entityId]);

  const fetchMessages = useCallback(
    async (options?: { append?: boolean }) => {
      setIsLoading(true);
      setError(null);

      try {
        if (!AUTH_ENABLED) {
          setMessages([]);
          setHasMore(false);
          return;
        }

        const offset = options?.append ? offsetRef.current : 0;
        const { data, error: fetchError, count } = await buildQuery().range(
          offset,
          offset + pageSize - 1,
        );

        if (fetchError) throw fetchError;

        const fetched = [...(data ?? [])].reverse() as AIMessage[];
        offsetRef.current = offset + fetched.length;
        setHasMore(offsetRef.current < (count ?? 0));

        setMessages((previous) => {
          if (!options?.append) return fetched;
          const seen = new Set(previous.map((message) => message.id));
          return [...fetched.filter((message) => !seen.has(message.id)), ...previous];
        });
      } catch (fetchError) {
        console.error("Failed to fetch AI messages:", fetchError);
        setError("Failed to fetch AI messages");
      } finally {
        setIsLoading(false);
      }
    },
    [buildQuery, pageSize],
  );

  useEffect(() => {
    offsetRef.current = 0;
    setMessages([]);
    void fetchMessages();
  }, [fetchMessages, scopeKey]);

  useEffect(() => {
    if (!AUTH_ENABLED) return;

    const channel = supabase
      .channel(`ai_messages:${scopeKey || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_messages",
        },
        (payload) => {
          const nextMessage = payload.new as AIMessage;

          if (conversationId && nextMessage.conversation_id !== conversationId) return;
          if (!conversationId && entityType && nextMessage.entity_type !== entityType) return;
          if (!conversationId && entityId && nextMessage.entity_id !== entityId) return;

          setMessages((previous) => {
            if (previous.some((message) => message.id === nextMessage.id)) return previous;
            return [...previous, nextMessage];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, entityType, entityId, scopeKey]);

  return {
    messages,
    isLoading,
    error,
    hasMore,
    refetch: () => fetchMessages(),
    loadMore: () => fetchMessages({ append: true }),
  };
}
