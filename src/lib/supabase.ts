import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cloud configuration for the game's persistence layer.
 *
 * Supports both key variable names so the game works with either
 * `VITE_SUPABASE_ANON_KEY` (anon key) or the scaffold's
 * `VITE_SUPABASE_PUBLISHABLE_KEY`. When neither is set the client stays
 * `null` and every cloud call degrades to a safe no-op — the game remains
 * fully playable offline.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const cloudClient: SupabaseClient | null = isCloudConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_KEY as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export const CLOUD_TABLES = {
  matchStats: "match_stats",
  leaderboard: "leaderboard",
  squadPerformances: "squad_performances",
} as const;