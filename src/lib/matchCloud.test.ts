import { describe, expect, it } from "vitest";
import {
  describeCloudError,
  LEADERBOARD_SCORE,
  buildMatchStatsRow,
  buildSquadPerformanceRows,
  computeLeaderboardScore,
  fetchLeaderboard,
  loadLocalMatches,
  saveMatchResult,
  saveMatchLocally,
  type MatchSummary,
} from "./matchCloud";
import { cloudClient, isCloudConfigured } from "./supabase";

const wonSummary: MatchSummary = {
  status: "won",
  durationSeconds: 240,
  kills: 12,
  healthRemaining: 80,
  squadSize: 3,
  squadSurvivors: 2,
  zoneRadius: 40,
};

describe("match cloud persistence", () => {
  it("translates raw network failures into clear Arabic reasons", () => {
    expect(describeCloudError("TypeError: Failed to fetch")).toContain(
      "تعذر الوصول لخادم السحابة",
    );
    expect(describeCloudError("NetworkError when attempting to fetch")).toContain(
      "تعذر الوصول لخادم السحابة",
    );
  });

  it("explains missing cloud tables instead of raw SQL errors", () => {
    expect(describeCloudError("relation \"match_stats\" does not exist")).toContain(
      "جداول السحابة غير مُهيّأة",
    );
  });

  it("keeps unconfigured and unknown reasons honest", () => {
    expect(describeCloudError("not-configured")).toContain("محفوظة على هذا الجهاز فقط");
    expect(describeCloudError(undefined)).toContain("محفوظة على هذا الجهاز فقط");
    expect(describeCloudError("some other error")).toBe("some other error");
  });

  it("computes a deterministic leaderboard score", () => {
    const expected =
      12 * LEADERBOARD_SCORE.perKill +
      LEADERBOARD_SCORE.winBonus +
      80 * LEADERBOARD_SCORE.perHealthPoint +
      2 * LEADERBOARD_SCORE.perSurvivor +
      240 * LEADERBOARD_SCORE.perSurvivedSecond;
    expect(computeLeaderboardScore(wonSummary)).toBe(expected);
    expect(computeLeaderboardScore(wonSummary)).toBe(
      computeLeaderboardScore(wonSummary),
    );
  });

  it("caps survival seconds for lost matches and skips the win bonus", () => {
    const lost = computeLeaderboardScore({ ...wonSummary, status: "lost" });
    const lostLong = computeLeaderboardScore({
      ...wonSummary,
      status: "lost",
      durationSeconds: 5000,
    });
    expect(lost).toBeLessThan(computeLeaderboardScore(wonSummary));
    expect(lostLong).toBe(lost);
  });

  it("never returns a negative score", () => {
    expect(
      computeLeaderboardScore({
        status: "lost",
        durationSeconds: 0,
        kills: 0,
        healthRemaining: 0,
        squadSize: 1,
        squadSurvivors: 0,
        zoneRadius: 0,
      }),
    ).toBe(0);
  });

  it("builds a snake_case stats row with clamped values", () => {
    const row = buildMatchStatsRow(
      { ...wonSummary, durationSeconds: -5, kills: -2, healthRemaining: 140 },
      "القائد",
    );
    expect(row.player_name).toBe("القائد");
    expect(row.status).toBe("won");
    expect(row.duration_seconds).toBe(0);
    expect(row.kills).toBe(0);
    expect(row.health_remaining).toBe(140);
    expect(row.score).toBe(computeLeaderboardScore(wonSummary));
  });

  it("defaults the player name for anonymous operators", () => {
    expect(buildMatchStatsRow(wonSummary).player_name).toBe("مقاتل مجهول");
  });

  it("maps squad states into performance rows keyed by match id", () => {
    const rows = buildSquadPerformanceRows("match-1", [
      { state: "active", health: 90, armor: 50 },
      { state: "downed", health: 30, armor: 0 },
      { state: "out", health: -12, armor: 0 },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.match_id === "match-1")).toBe(true);
    expect(rows.map((row) => row.mate_index)).toEqual([0, 1, 2]);
    expect(rows[2].health).toBe(0);
    expect(rows[0].state).toBe("active");
  });

  it("degrades to a safe no-op without Supabase configuration", async () => {
    if (isCloudConfigured || cloudClient) {
      return;
    }
    const result = await saveMatchResult(wonSummary, []);
    expect(result.saved).toBe(false);
    expect(result.reason).toBe("not-configured");
    expect(await fetchLeaderboard(5)).toEqual([]);
  });
});

describe("local match history", () => {
  it("saves and loads matches on the device without any account", () => {
    window.localStorage.clear();
    const record = saveMatchLocally(wonSummary, "الصقر");
    expect(record).not.toBeNull();
    expect(record?.playerName).toBe("الصقر");
    expect(record?.score).toBe(computeLeaderboardScore(wonSummary));
    const history = loadLocalMatches();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe("won");
    expect(history[0].kills).toBe(12);
  });

  it("caps the local history at 50 entries with newest first", () => {
    window.localStorage.clear();
    for (let i = 0; i < 55; i += 1) {
      saveMatchLocally({ ...wonSummary, kills: i });
    }
    const history = loadLocalMatches();
    expect(history).toHaveLength(50);
    expect(history[0].kills).toBe(54);
    expect(history[49].kills).toBe(5);
  });
});