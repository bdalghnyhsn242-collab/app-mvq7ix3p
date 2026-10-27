import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { AUTH_ENABLED } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import type { AuthSession, AuthUser } from "@/lib/auth";

type AuthContextType = {
  session: AuthSession;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const guestUser: AuthUser = {
  id: "guest",
  email: "",
  full_name: "Guest",
  avatar_url: null,
  isGuest: true,
};

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function isAuthEntryPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return normalized === "/" || normalized === "/auth";
}

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || "",
    full_name: user.user_metadata?.full_name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession>({
    user: AUTH_ENABLED ? null : guestUser,
    isLoading: AUTH_ENABLED,
  });
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refreshSession = useCallback(async () => {
    if (!AUTH_ENABLED) {
      setSession({ user: guestUser, isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to get Supabase session:", error.message);
        setSession({ user: null, isLoading: false });
        return;
      }

      setSession({
        user: mapUser(data.session?.user ?? null),
        isLoading: false,
      });
    } catch (error) {
      console.error("Unexpected auth refresh error:", error);
      setSession({ user: null, isLoading: false });
    }
  }, []);

  const isAuthenticated = !AUTH_ENABLED || Boolean(session.user && !session.isLoading);

  useEffect(() => {
    if (!AUTH_ENABLED) {
      setSession({ user: guestUser, isLoading: false });
      return;
    }

    void refreshSession();

    const debouncedRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        void refreshSession();
      }, 200);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession({
          user: mapUser(supabaseSession?.user ?? null),
          isLoading: false,
        });

        if (event === "SIGNED_IN" && isAuthEntryPath(window.location.pathname)) {
          navigate("/", { replace: true });
        }

        setTimeout(debouncedRefresh, 0);
        return;
      }

      if (event === "SIGNED_OUT") {
        setSession({ user: null, isLoading: false });
        navigate("/auth", { replace: true });
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !sessionRef.current.isLoading) {
        debouncedRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [navigate, refreshSession]);

  return (
    <AuthContext.Provider value={{ session, refreshSession, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
