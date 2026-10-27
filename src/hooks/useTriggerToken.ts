import { useCallback, useEffect, useRef, useState } from "react";
import { AUTH_ENABLED } from "@/config/features";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_TTL_MS = 14 * 60 * 1000;

export function useTriggerToken() {
  const { session, isAuthenticated } = useAuth();
  const userId = session.user?.id;
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const expiryRef = useRef(0);

  const fetchToken = useCallback(async () => {
    if (!AUTH_ENABLED) return;
    if (!isAuthenticated || !userId) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;
      if (!jwt) throw new Error("Missing Supabase session token");

      const { data, error: invokeError } = await supabase.functions.invoke("trigger-token", {
        body: {},
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (invokeError) throw invokeError;
      if (!data?.token) throw new Error("trigger-token returned no token");

      expiryRef.current = Date.now() + TOKEN_TTL_MS;
      setToken(data.token);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch Trigger token");
      setToken(null);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!AUTH_ENABLED) return;

    void fetchToken();

    const interval = window.setInterval(() => {
      if (Date.now() >= expiryRef.current) {
        void fetchToken();
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [fetchToken]);

  return { token, error, refetch: fetchToken };
}
