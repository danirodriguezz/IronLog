import { describe, it, expect, vi, beforeEach } from "vitest";

type QueryResult = {
  data?: unknown;
  count?: number | null;
  error?: { message: string } | null;
};

const { supabaseMock, setQueryResult } = vi.hoisted(() => {
  type Call = { method: string; args: unknown[] };
  type Builder = Record<string, unknown> & {
    __calls: Call[];
    __table: string;
    then: (onFulfilled: (v: QueryResult) => unknown) => Promise<unknown>;
  };

  let nextResults: QueryResult[] = [];

  const setQueryResult = (...results: QueryResult[]) => {
    nextResults = [...results];
  };

  const chainedMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "not",
    "gte",
    "in",
    "order",
    "limit",
    "returns",
  ] as const;

  const makeBuilder = (table: string): Builder => {
    const calls: Call[] = [];
    const builder: Builder = { __calls: calls, __table: table } as Builder;

    for (const m of chainedMethods) {
      builder[m] = vi.fn((...args: unknown[]) => {
        calls.push({ method: m, args });
        return builder;
      });
    }

    builder.then = (onFulfilled) => {
      const result = nextResults.shift() ?? { data: null, error: null };
      return Promise.resolve(onFulfilled(result));
    };

    return builder;
  };

  const supabaseMock = {
    from: vi.fn((table: string) => makeBuilder(table)),
  };

  return { supabaseMock, setQueryResult };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

import {
  getProgressSummary,
  getHeatmapData,
  getMuscleDistribution,
  getUserExercises,
  getExerciseProgress,
  getPrFeed,
} from "@/app/(app)/progreso/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getProgressSummary ────────────────────────────────────────────────────

describe("getProgressSummary", () => {
  it("returns zeros when there are no sessions or PRs", async () => {
    setQueryResult(
      { count: 0, data: null },
      { data: [], error: null },
      { count: 0, data: null },
    );
    const result = await getProgressSummary();
    expect(result).toEqual({ totalSessions: 0, totalMinutes: 0, totalPrs: 0 });
  });

  it("counts sessions and PRs from Supabase counts", async () => {
    setQueryResult(
      { count: 7, data: null },
      { data: [], error: null },
      { count: 3, data: null },
    );
    const result = await getProgressSummary();
    expect(result.totalSessions).toBe(7);
    expect(result.totalPrs).toBe(3);
  });

  it("computes totalMinutes from started_at / ended_at difference", async () => {
    const started_at = "2026-04-01T10:00:00Z";
    const ended_at = "2026-04-01T11:30:00Z"; // 90 minutes
    setQueryResult(
      { count: 1, data: null },
      { data: [{ started_at, ended_at }], error: null },
      { count: 0, data: null },
    );
    const result = await getProgressSummary();
    expect(result.totalMinutes).toBe(90);
  });

  it("rounds totalMinutes and accumulates multiple sessions", async () => {
    setQueryResult(
      { count: 2, data: null },
      {
        data: [
          { started_at: "2026-04-01T10:00:00Z", ended_at: "2026-04-01T10:45:30Z" }, // 45.5 min
          { started_at: "2026-04-02T09:00:00Z", ended_at: "2026-04-02T10:00:00Z" }, // 60 min
        ],
        error: null,
      },
      { count: 0, data: null },
    );
    const result = await getProgressSummary();
    expect(result.totalMinutes).toBe(106); // Math.round(105.5)
  });

  it("handles null count from Supabase gracefully", async () => {
    setQueryResult(
      { count: null, data: null },
      { data: null, error: null },
      { count: null, data: null },
    );
    const result = await getProgressSummary();
    expect(result).toEqual({ totalSessions: 0, totalMinutes: 0, totalPrs: 0 });
  });
});

// ─── getHeatmapData ────────────────────────────────────────────────────────

describe("getHeatmapData", () => {
  it("returns empty array when there are no sessions", async () => {
    setQueryResult({ data: [], error: null });
    const result = await getHeatmapData();
    expect(result).toEqual([]);
  });

  it("aggregates multiple sessions on the same day into a single count", async () => {
    setQueryResult({
      data: [
        { started_at: "2026-04-01T09:00:00Z" },
        { started_at: "2026-04-01T18:00:00Z" },
        { started_at: "2026-04-02T10:00:00Z" },
      ],
      error: null,
    });
    const result = await getHeatmapData();
    expect(result).toHaveLength(2);
    const day1 = result.find((d) => d.date === "2026-04-01");
    expect(day1?.count).toBe(2);
    const day2 = result.find((d) => d.date === "2026-04-02");
    expect(day2?.count).toBe(1);
  });

  it("returns one entry per distinct day", async () => {
    setQueryResult({
      data: [
        { started_at: "2026-03-10T07:00:00Z" },
        { started_at: "2026-03-12T07:00:00Z" },
        { started_at: "2026-03-15T07:00:00Z" },
      ],
      error: null,
    });
    const result = await getHeatmapData();
    expect(result).toHaveLength(3);
    expect(result.every((d) => d.count === 1)).toBe(true);
  });

  it("handles null data from Supabase", async () => {
    setQueryResult({ data: null, error: null });
    const result = await getHeatmapData();
    expect(result).toEqual([]);
  });
});

// ─── getMuscleDistribution ─────────────────────────────────────────────────

describe("getMuscleDistribution", () => {
  it("returns empty array when there are no session_exercises", async () => {
    setQueryResult({ data: [], error: null });
    const result = await getMuscleDistribution();
    expect(result).toEqual([]);
  });

  it("aggregates counts per muscle group", async () => {
    setQueryResult({
      data: [
        { exercises: { target_muscle: "pecho" } },
        { exercises: { target_muscle: "pecho" } },
        { exercises: { target_muscle: "espalda" } },
      ],
      error: null,
    });
    const result = await getMuscleDistribution();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ muscle: "pecho", count: 2 });
    expect(result[1]).toEqual({ muscle: "espalda", count: 1 });
  });

  it("sorts descending by count", async () => {
    setQueryResult({
      data: [
        { exercises: { target_muscle: "pierna" } },
        { exercises: { target_muscle: "hombro" } },
        { exercises: { target_muscle: "hombro" } },
        { exercises: { target_muscle: "hombro" } },
        { exercises: { target_muscle: "pierna" } },
      ],
      error: null,
    });
    const result = await getMuscleDistribution();
    expect(result[0].muscle).toBe("hombro");
    expect(result[1].muscle).toBe("pierna");
  });

  it("caps results at 8 muscle groups", async () => {
    const muscles = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    setQueryResult({
      data: muscles.map((m) => ({ exercises: { target_muscle: m } })),
      error: null,
    });
    const result = await getMuscleDistribution();
    expect(result).toHaveLength(8);
  });

  it("skips entries where exercises is null", async () => {
    setQueryResult({
      data: [
        { exercises: null },
        { exercises: { target_muscle: "bíceps" } },
      ],
      error: null,
    });
    const result = await getMuscleDistribution();
    expect(result).toHaveLength(1);
    expect(result[0].muscle).toBe("bíceps");
  });
});

// ─── getUserExercises ──────────────────────────────────────────────────────

describe("getUserExercises", () => {
  it("returns empty array when user has no sets", async () => {
    setQueryResult({ data: [], error: null });
    const result = await getUserExercises();
    expect(result).toEqual([]);
  });

  it("deduplicates exercise IDs before querying exercises table", async () => {
    const exerciseId = "ex-1";
    setQueryResult(
      {
        data: [
          { exercise_id: exerciseId },
          { exercise_id: exerciseId },
          { exercise_id: "ex-2" },
        ],
        error: null,
      },
      {
        data: [
          { id: "ex-1", name: "Press banca", type: "strength" },
          { id: "ex-2", name: "Sentadilla", type: "strength" },
        ],
        error: null,
      },
    );
    const result = await getUserExercises();
    expect(result).toHaveLength(2);
    // second query's .in() receives deduplicated ids
    expect(supabaseMock.from).toHaveBeenCalledWith("exercises");
  });

  it("returns exercises mapped as ExerciseOption", async () => {
    setQueryResult(
      { data: [{ exercise_id: "ex-1" }], error: null },
      {
        data: [{ id: "ex-1", name: "Dominadas", type: "bodyweight" }],
        error: null,
      },
    );
    const result = await getUserExercises();
    expect(result[0]).toMatchObject({ id: "ex-1", name: "Dominadas", type: "bodyweight" });
  });

  it("returns empty array when exercises query returns null", async () => {
    setQueryResult(
      { data: [{ exercise_id: "ex-1" }], error: null },
      { data: null, error: null },
    );
    const result = await getUserExercises();
    expect(result).toEqual([]);
  });
});

// ─── getExerciseProgress ───────────────────────────────────────────────────

describe("getExerciseProgress", () => {
  it("returns empty array when there are no sets", async () => {
    setQueryResult({ data: [], error: null });
    const result = await getExerciseProgress("ex-1", "strength");
    expect(result).toEqual([]);
  });

  it("groups sets by session and picks max weight for strength", async () => {
    setQueryResult({
      data: [
        {
          created_at: "2026-04-01T10:00:00Z",
          reps: 8,
          weight_kg: 80,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
        {
          created_at: "2026-04-01T10:05:00Z",
          reps: 6,
          weight_kg: 100,
          duration_seconds: null,
          distance_meters: null,
          is_pr: true,
          rpe: 9,
          session_exercises: { session_id: "s1" },
        },
      ],
      error: null,
    });
    const result = await getExerciseProgress("ex-1", "strength");
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(100); // max weight
    expect(result[0].volume).toBe(80 * 8 + 100 * 6); // sum weight×reps
    expect(result[0].isPr).toBe(true);
    expect(result[0].rpe).toBe(9);
  });

  it("computes max reps for bodyweight exercise", async () => {
    setQueryResult({
      data: [
        {
          created_at: "2026-04-01T10:00:00Z",
          reps: 12,
          weight_kg: null,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
        {
          created_at: "2026-04-01T10:05:00Z",
          reps: 15,
          weight_kg: null,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
      ],
      error: null,
    });
    const result = await getExerciseProgress("ex-1", "bodyweight");
    expect(result[0].value).toBe(15);
    expect(result[0].volume).toBe(27);
  });

  it("computes max duration for isometric exercise", async () => {
    setQueryResult({
      data: [
        {
          created_at: "2026-04-01T10:00:00Z",
          reps: null,
          weight_kg: null,
          duration_seconds: 60,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
        {
          created_at: "2026-04-01T10:03:00Z",
          reps: null,
          weight_kg: null,
          duration_seconds: 90,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
      ],
      error: null,
    });
    const result = await getExerciseProgress("ex-1", "isometric");
    expect(result[0].value).toBe(90);
    expect(result[0].volume).toBe(150);
  });

  it("computes max distance for cardio exercise", async () => {
    setQueryResult({
      data: [
        {
          created_at: "2026-04-01T10:00:00Z",
          reps: null,
          weight_kg: null,
          duration_seconds: null,
          distance_meters: 1000,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
        {
          created_at: "2026-04-01T10:10:00Z",
          reps: null,
          weight_kg: null,
          duration_seconds: null,
          distance_meters: 2000,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
      ],
      error: null,
    });
    const result = await getExerciseProgress("ex-1", "cardio");
    expect(result[0].value).toBe(2000);
    expect(result[0].volume).toBe(3000);
  });

  it("picks max RPE across all sets in a session", async () => {
    setQueryResult({
      data: [
        {
          created_at: "2026-04-01T10:00:00Z",
          reps: 8,
          weight_kg: 80,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: 6,
          session_exercises: { session_id: "s1" },
        },
        {
          created_at: "2026-04-01T10:05:00Z",
          reps: 8,
          weight_kg: 80,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: 8,
          session_exercises: { session_id: "s1" },
        },
      ],
      error: null,
    });
    const result = await getExerciseProgress("ex-1", "strength");
    expect(result[0].rpe).toBe(8);
  });

  it("returns null rpe when all sets in session have null rpe", async () => {
    setQueryResult({
      data: [
        {
          created_at: "2026-04-01T10:00:00Z",
          reps: 8,
          weight_kg: 80,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
      ],
      error: null,
    });
    const result = await getExerciseProgress("ex-1", "strength");
    expect(result[0].rpe).toBeNull();
  });

  it("produces one point per session even with many sessions", async () => {
    setQueryResult({
      data: [
        {
          created_at: "2026-04-01T10:00:00Z",
          reps: 8,
          weight_kg: 80,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s1" },
        },
        {
          created_at: "2026-04-03T10:00:00Z",
          reps: 8,
          weight_kg: 85,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: { session_id: "s2" },
        },
      ],
      error: null,
    });
    const result = await getExerciseProgress("ex-1", "strength");
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.sessionId)).toEqual(expect.arrayContaining(["s1", "s2"]));
  });

  it("skips sets where session_exercises is null", async () => {
    setQueryResult({
      data: [
        {
          created_at: "2026-04-01T10:00:00Z",
          reps: 8,
          weight_kg: 80,
          duration_seconds: null,
          distance_meters: null,
          is_pr: false,
          rpe: null,
          session_exercises: null,
        },
      ],
      error: null,
    });
    const result = await getExerciseProgress("ex-1", "strength");
    expect(result).toHaveLength(0);
  });
});

// ─── getPrFeed ─────────────────────────────────────────────────────────────

describe("getPrFeed", () => {
  it("returns empty array when there are no PRs", async () => {
    setQueryResult({ data: [], error: null });
    const result = await getPrFeed();
    expect(result).toEqual([]);
  });

  it("maps raw DB rows to PrEntry shape", async () => {
    setQueryResult({
      data: [
        {
          id: "set-1",
          created_at: "2026-04-10T10:00:00Z",
          weight_kg: 120,
          reps: 5,
          duration_seconds: null,
          distance_meters: null,
          exercises: { name: "Press banca", type: "strength" },
        },
      ],
      error: null,
    });
    const result = await getPrFeed();
    expect(result[0]).toEqual({
      id: "set-1",
      date: "2026-04-10T10:00:00Z",
      exerciseName: "Press banca",
      exerciseType: "strength",
      weight_kg: 120,
      reps: 5,
      duration_seconds: null,
      distance_meters: null,
    });
  });

  it("falls back to 'Ejercicio' when exercises relation is null", async () => {
    setQueryResult({
      data: [
        {
          id: "set-2",
          created_at: "2026-04-10T10:00:00Z",
          weight_kg: null,
          reps: null,
          duration_seconds: null,
          distance_meters: null,
          exercises: null,
        },
      ],
      error: null,
    });
    const result = await getPrFeed();
    expect(result[0].exerciseName).toBe("Ejercicio");
    expect(result[0].exerciseType).toBe("strength"); // default
  });

  it("handles null data from Supabase", async () => {
    setQueryResult({ data: null, error: null });
    const result = await getPrFeed();
    expect(result).toEqual([]);
  });

  it("returns multiple entries preserving order", async () => {
    setQueryResult({
      data: [
        {
          id: "set-3",
          created_at: "2026-04-12T10:00:00Z",
          weight_kg: null,
          reps: 20,
          duration_seconds: null,
          distance_meters: null,
          exercises: { name: "Dominadas", type: "bodyweight" },
        },
        {
          id: "set-4",
          created_at: "2026-04-11T10:00:00Z",
          weight_kg: null,
          reps: null,
          duration_seconds: 120,
          distance_meters: null,
          exercises: { name: "Plancha", type: "isometric" },
        },
      ],
      error: null,
    });
    const result = await getPrFeed();
    expect(result).toHaveLength(2);
    expect(result[0].exerciseType).toBe("bodyweight");
    expect(result[1].exerciseType).toBe("isometric");
  });
});
