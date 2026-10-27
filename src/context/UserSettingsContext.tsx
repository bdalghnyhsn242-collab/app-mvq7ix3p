import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AUTH_ENABLED } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/context/AuthContext";

type SettingsMap = Record<string, Record<string, Json>>;

type UpdateSettingOptions = {
  secure?: boolean;
};

type UserSettingsContextType = {
  settings: SettingsMap;
  isLoading: boolean;
  error: string | null;
  getSetting: (category: string, key: string) => Json | null;
  updateSetting: (
    category: string,
    key: string,
    value: Json,
    options?: UpdateSettingOptions,
  ) => Promise<boolean>;
  deleteSetting: (category: string, key: string) => Promise<boolean>;
  refetchSettings: () => Promise<void>;
};

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

const LOCAL_SETTINGS_KEY = "latchloop-app-base.settings";

function readLocalSettings(): SettingsMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as SettingsMap) : {};
  } catch {
    return {};
  }
}

function writeLocalSettings(settings: SettingsMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

export const UserSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const fetchInProgressRef = useRef(false);
  const fetchedForUserRef = useRef<string | null>(null);

  const loadSettings = useCallback(async (force = false) => {
    if (!AUTH_ENABLED) {
      setSettings(readLocalSettings());
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!session.user?.id) return;
    if (fetchInProgressRef.current) return;
    if (!force && fetchedForUserRef.current === session.user.id) return;

    fetchInProgressRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("user_settings")
        .select("category,key,value")
        .eq("user_id", session.user.id);

      if (fetchError) throw fetchError;

      const nextSettings: SettingsMap = {};
      for (const setting of data ?? []) {
        nextSettings[setting.category] = nextSettings[setting.category] ?? {};
        nextSettings[setting.category][setting.key] = setting.value;
      }

      setSettings(nextSettings);
      fetchedForUserRef.current = session.user.id;
    } catch (loadError) {
      console.error("Failed to load user settings:", loadError);
      setError("Failed to load settings");
    } finally {
      fetchInProgressRef.current = false;
      setIsLoading(false);
    }
  }, [session.user?.id]);

  useEffect(() => {
    if (!AUTH_ENABLED) {
      setSettings(readLocalSettings());
      setError(null);
      fetchedForUserRef.current = null;
      return;
    }

    if (!session.user?.id) {
      setSettings({});
      setError(null);
      fetchedForUserRef.current = null;
      return;
    }

    void loadSettings();
  }, [loadSettings, session.user?.id]);

  const refetchSettings = useCallback(async () => {
    await loadSettings(true);
  }, [loadSettings]);

  const getSetting = useCallback(
    (category: string, key: string) => {
      if (!session.user) return null;
      return settings[category]?.[key] ?? null;
    },
    [settings, session.user],
  );

  const updateSetting = useCallback(
    async (category: string, key: string, value: Json, options?: UpdateSettingOptions) => {
      if (!AUTH_ENABLED) {
        setSettings((previous) => {
          const next = {
            ...previous,
            [category]: {
              ...(previous[category] ?? {}),
              [key]: value,
            },
          };
          writeLocalSettings(next);
          return next;
        });
        return true;
      }

      if (!session.user?.id) return false;

      setIsLoading(true);
      setError(null);

      try {
        if (options?.secure) {
          const { data } = await supabase.auth.getSession();
          const jwt = data.session?.access_token;
          if (!jwt) throw new Error("Missing Supabase session token");

          const { error: invokeError } = await supabase.functions.invoke("save-user-setting", {
            body: { category, key, value },
            headers: { Authorization: `Bearer ${jwt}` },
          });

          if (invokeError) throw invokeError;
        } else {
          const { error: upsertError } = await supabase.from("user_settings").upsert(
            {
              user_id: session.user.id,
              category,
              key,
              value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,category,key" },
          );

          if (upsertError) throw upsertError;
        }

        setSettings((previous) => ({
          ...previous,
          [category]: {
            ...(previous[category] ?? {}),
            [key]: value,
          },
        }));

        return true;
      } catch (updateError) {
        console.error("Failed to update user setting:", updateError);
        setError("Failed to update setting");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [session.user?.id],
  );

  const deleteSetting = useCallback(
    async (category: string, key: string) => {
      if (!AUTH_ENABLED) {
        setSettings((previous) => {
          const next = { ...previous };
          if (next[category]) {
            next[category] = { ...next[category] };
            delete next[category][key];
          }
          writeLocalSettings(next);
          return next;
        });
        return true;
      }

      if (!session.user?.id) return false;

      setIsLoading(true);
      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from("user_settings")
          .delete()
          .eq("user_id", session.user.id)
          .eq("category", category)
          .eq("key", key);

        if (deleteError) throw deleteError;

        setSettings((previous) => {
          const next = { ...previous };
          if (next[category]) {
            next[category] = { ...next[category] };
            delete next[category][key];
          }
          return next;
        });

        return true;
      } catch (deleteError) {
        console.error("Failed to delete user setting:", deleteError);
        setError("Failed to delete setting");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [session.user?.id],
  );

  return (
    <UserSettingsContext.Provider
      value={{
        settings,
        isLoading,
        error,
        getSetting,
        updateSetting,
        deleteSetting,
        refetchSettings,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error("useUserSettings must be used within a UserSettingsProvider");
  }

  return context;
};
