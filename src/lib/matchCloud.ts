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
};

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
  if (!isCloudConfigured || !cloudClient) {
    return { saved: false, reason: "not-configured" };
  }
  try {
    const row = buildMatchStatsRow(summary, playerName);
    const { data, error } = await cloudClient
      .from(CLOUD_TABLES.matchStats)
      .insert(row)
      .select("id")
      .single();
    if (error) {
      return { saved: false, reason: error.message };
    }
    const matchId = String((data as { id: string }).id);
    const squadRows = buildSquadPerformanceRows(matchId, squad);
    if (squadRows.length > 0) {
      const { error: squadError } = await cloudClient
        .from(CLOUD_TABLES.squadPerformances)
        .insert(squadRows);
      if (squadError) {
        return { saved: false, matchId, reason: squadError.message };
      }
    }
    await upsertLeaderboard(summary, row.score as number, playerName);
    return { saved: true, matchId };
  } catch (error) {
    return {
      saved: false,
      reason: error instanceof Error ? error.message : "unknown-error",
    };
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