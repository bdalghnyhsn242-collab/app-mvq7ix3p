import { CLOUD_TABLES, cloudClient, isCloudConfigured } from "./supabase";

export type MatchEndStatus = "won" | "lost";

export type MatchSummary = {
  status: MatchEndStatus;
  durationSeconds: number;
  kills: number;
  healthRemaining: number;
  squadSize: number;
  squadSurvivors: number;
  zoneRadius: number;
};

export type SquadMateStat = {
  state: string;
  health: number;
  armor: number;
};

export const LEADERBOARD_SCORE = {
  perKill: 100,
  winBonus: 1000,
  perHealthPoint: 2,
  perSurvivor: 150,
  perSurvivedSecond: 1,
} as const;

/** Deterministic score used for the leaderboard ranking. */
export function computeLeaderboardScore(summary: MatchSummary): number {
  const survivalSeconds = summary.status === "won"
    ? summary.durationSeconds
    : Math.min(summary.durationSeconds, 600);
  return Math.max(
    0,
    Math.round(
      summary.kills * LEADERBOARD_SCORE.perKill +
        (summary.status === "won" ? LEADERBOARD_SCORE.winBonus : 0) +
        summary.healthRemaining * LEADERBOARD_SCORE.perHealthPoint +
        summary.squadSurvivors * LEADERBOARD_SCORE.perSurvivor +
        survivalSeconds * LEADERBOARD_SCORE.perSurvivedSecond,
    ),
  );
}

export function buildMatchStatsRow(
  summary: MatchSummary,
  playerName: string = "مقاتل مجهول",
): Record<string, unknown> {
  return {
    player_name: playerName,
    status: summary.status,
    duration_seconds: Math.max(0, Math.round(summary.durationSeconds)),
    kills: Math.max(0, Math.round(summary.kills)),
    health_remaining: Math.max(0, Math.round(summary.healthRemaining)),
    squad_size: Math.max(1, Math.round(summary.squadSize)),
    squad_survivors: Math.max(0, Math.round(summary.squadSurvivors)),
    zone_radius: Math.max(0, Math.round(summary.zoneRadius)),
    score: computeLeaderboardScore(summary),
  };
}

export function buildSquadPerformanceRows(
  matchId: string,
  squad: SquadMateStat[],
): Record<string, unknown>[] {
  return squad.map((mate, index) => ({
    match_id: matchId,
    mate_index: index,
    state: mate.state,
    health: Math.max(0, Math.round(mate.health)),
    armor: Math.max(0, Math.round(mate.armor)),
  }));
}

export type CloudSaveResult = {
  saved: boolean;
  matchId?: string;
  reason?: string;
  /** True when the result was persisted to this device after a cloud failure. */
  savedLocally?: boolean;
};

/** Raw fetch/HTTP failures that mean "the cloud server was unreachable". */
const NETWORK_ERROR_PATTERN =
  /failed to fetch|networkerror|fetch failed|load failed|network request failed/i;
/** Failures that mean the cloud tables were never created (migration missing). */
const SCHEMA_ERROR_PATTERN =
  /does not exist|relation|schema cache|pgrst20|pgrst205/i;

/**
 * Translates a raw cloud failure into a clear Arabic explanation so the
 * player is never shown a cryptic English "TypeError: Failed to fetch".
 */
export function describeCloudError(reason: string | undefined): string {
  if (!reason || reason === "not-configured") {
    return "الحفظ السحابي غير مُهيّأ — النتيجة محفوظة على هذا الجهاز فقط";
  }
  if (NETWORK_ERROR_PATTERN.test(reason)) {
    return "تعذر الوصول لخادم السحابة — الشبكة غير متاحة أو مشروع Supabase متوقف مؤقتًا";
  }
  if (SCHEMA_ERROR_PATTERN.test(reason)) {
    return "جداول السحابة غير مُهيّأة — طبّق ملف الترحيل supabase/migrations/20260504000000_game_cloud_tables.sql";
  }
  return reason;
}

function isNetworkError(message: string): boolean {
  return NETWORK_ERROR_PATTERN.test(message);
}

/** Postgres unique-violation: the row already exists from a lost response. */
function isDuplicateKeyError(message: string): boolean {
  return /duplicate key|23505/i.test(message);
}

/** crypto.randomUUID with an RFC4122-v4 fallback for older browsers. */
function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const SAVE_RETRY_DELAY_MS = 1500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type LocalMatchRecord = {
  savedAt: string;
  playerName: string;
  status: MatchEndStatus;
  score: number;
  kills: number;
  durationSeconds: number;
  squadSize: number;
  squadSurvivors: number;
};

const LOCAL_MATCHES_KEY = "last-stand:match-history";
const LOCAL_MATCHES_LIMIT = 50;

/** Reads the on-device match history (oldest last, newest first). */
export function loadLocalMatches(): LocalMatchRecord[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_MATCHES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LocalMatchRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persists a finished match on this device. Works without any account or
 * network; returns null when storage is unavailable (private mode).
 */
export function saveMatchLocally(
  summary: MatchSummary,
  playerName: string = "مقاتل مجهول",
): LocalMatchRecord | null {
  try {
    const record: LocalMatchRecord = {
      savedAt: new Date().toISOString(),
      playerName,
      status: summary.status,
      score: computeLeaderboardScore(summary),
      kills: Math.max(0, Math.round(summary.kills)),
      durationSeconds: Math.max(0, Math.round(summary.durationSeconds)),
      squadSize: Math.max(1, Math.round(summary.squadSize)),
      squadSurvivors: Math.max(0, Math.round(summary.squadSurvivors)),
    };
    const next = [record, ...loadLocalMatches()].slice(0, LOCAL_MATCHES_LIMIT);
    window.localStorage.setItem(LOCAL_MATCHES_KEY, JSON.stringify(next));
    return record;
  } catch {
    return null;
  }
}

export type LeaderboardEntry = {
  player_name: string;
  best_score: number;
  total_matches: number;
  total_kills: number;
  wins: number;
  updated_at?: string;
};

async function upsertLeaderboard(
  summary: MatchSummary,
  score: number,
  playerName: string,
): Promise<void> {
  if (!cloudClient) {
    return;
  }
  const { data } = await cloudClient
    .from(CLOUD_TABLES.leaderboard)
    .select("best_score, total_matches, total_kills, wins")
    .eq("player_name", playerName)
    .maybeSingle();
  const existing = (data ?? null) as
    | { best_score: number; total_matches: number; total_kills: number; wins: number }
    | null;
  const next = {
    player_name: playerName,
    best_score: Math.max(score, existing?.best_score ?? 0),
    total_matches: (existing?.total_matches ?? 0) + 1,
    total_kills: (existing?.total_kills ?? 0) + Math.max(0, Math.round(summary.kills)),
    wins: (existing?.wins ?? 0) + (summary.status === "won" ? 1 : 0),
    updated_at: new Date().toISOString(),
  };
  const { error } = await cloudClient
    .from(CLOUD_TABLES.leaderboard)
    .upsert(next, { onConflict: "player_name" });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Persists a finished match: stats row, squad performance rows, and a
 * leaderboard upsert. Degrades to a no-op when Supabase is not configured.
 */
export async function saveMatchResult(
  summary: MatchSummary,
  squad: SquadMateStat[],
  playerName: string = "مقاتل مجهول",
): Promise<CloudSaveResult> {
  const localFallback = (reason: string): CloudSaveResult => {
    const record = saveMatchLocally(summary, playerName);
    return { saved: false, reason, savedLocally: record !== null };
  };
  if (!isCloudConfigured || !cloudClient) {
    return localFallback("not-configured");
  }
  // Stable client-generated ids make a retried insert idempotent: if the
  // first attempt actually landed but its response was lost (the classic
  // "Failed to fetch" after a successful write), the retry hits a
  // duplicate key (23505) and is treated as success — never saved twice.
  const matchId = randomUuid();
  const row = { id: matchId, ...buildMatchStatsRow(summary, playerName) };
  const squadRows = buildSquadPerformanceRows(matchId, squad).map((squadRow) => ({
    id: randomUuid(),
    ...squadRow,
  }));
  try {
    let insertError = "";
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const { error } = await cloudClient
        .from(CLOUD_TABLES.matchStats)
        .insert(row);
      if (!error) {
        insertError = "";
        break;
      }
      insertError = error.message;
      if (isDuplicateKeyError(insertError)) {
        insertError = "";
        break;
      }
      // One safe retry for transient network failures on the FIRST step
      // only — later steps are never retried so the leaderboard counters
      // can never be double-incremented by a retry.
      if (!isNetworkError(insertError) || attempt === 2) {
        break;
      }
      await wait(SAVE_RETRY_DELAY_MS);
    }
    if (insertError) {
      return localFallback(insertError);
    }
    if (squadRows.length > 0) {
      const { error: squadError } = await cloudClient
        .from(CLOUD_TABLES.squadPerformances)
        .insert(squadRows);
      if (squadError && !isDuplicateKeyError(squadError.message)) {
        return localFallback(squadError.message);
      }
    }
    await upsertLeaderboard(summary, row.score as number, playerName);
    return { saved: true, matchId };
  } catch (error) {
    return localFallback(error instanceof Error ? error.message : "unknown-error");
  }
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  if (!cloudClient) {
    return [];
  }
  const { data, error } = await cloudClient
    .from(CLOUD_TABLES.leaderboard)
    .select("player_name, best_score, total_matches, total_kills, wins, updated_at")
    .order("best_score", { ascending: false })
    .limit(Math.max(1, Math.min(50, limit)));
  if (error) {
    return [];
  }
  return (data ?? []) as LeaderboardEntry[];
}