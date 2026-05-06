import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks hoisted ────────────────────────────────────────────────────────────

const {
  supabaseMock,
  setQueryResult,
  getBuilders,
  resetBuilders,
  generateTextMock,
  revalidatePathMock,
} = vi.hoisted(() => {
  type QueryResult = { data?: unknown; error?: { message: string } | null };
  type Call = { method: string; args: unknown[] };
  type Builder = Record<string, unknown> & {
    __calls: Call[];
    __table: string;
    then: (onFulfilled: (v: QueryResult) => unknown) => Promise<unknown>;
  };

  let nextResults: QueryResult[] = [];
  let builders: Builder[] = [];

  const setQueryResult = (...results: QueryResult[]) => {
    nextResults = [...results];
  };
  const getBuilders = () => builders;
  const resetBuilders = () => {
    builders = [];
    nextResults = [];
  };

  const chainedMethods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "in", "gte", "order", "limit", "returns",
  ] as const;
  const terminalMethods = ["single", "maybeSingle"] as const;

  const makeBuilder = (table: string): Builder => {
    const calls: Call[] = [];
    const builder: Builder = { __calls: calls, __table: table } as Builder;

    for (const m of chainedMethods) {
      builder[m] = vi.fn((...args: unknown[]) => {
        calls.push({ method: m, args });
        return builder;
      });
    }
    for (const m of terminalMethods) {
      builder[m] = vi.fn((...args: unknown[]) => {
        calls.push({ method: m, args });
        const result = nextResults.shift() ?? { data: null, error: null };
        return Promise.resolve(result);
      });
    }
    builder.then = (onFulfilled) => {
      const result = nextResults.shift() ?? { data: null, error: null };
      return Promise.resolve(onFulfilled(result));
    };

    builders.push(builder);
    return builder;
  };

  const supabaseMock = {
    auth: { getUser: vi.fn() },
    from: vi.fn((table: string) => makeBuilder(table)),
  };

  const generateTextMock = vi.fn();
  const revalidatePathMock = vi.fn();

  return {
    supabaseMock,
    setQueryResult,
    getBuilders,
    resetBuilders,
    generateTextMock,
    revalidatePathMock,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

vi.mock("ai", () => ({
  generateText: generateTextMock,
  Output: {
    object: vi.fn(({ schema }) => ({ type: "object", schema })),
  },
}));

vi.mock("@ai-sdk/groq", () => ({
  createGroq: vi.fn(() => vi.fn((model: string) => ({ model }))),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  fetchUserContextForAI,
  generateWeeklyFeedback,
  getCachedFeedback,
  applyRoutineRecommendation,
  type WeeklyFeedback,
} from "@/app/(app)/coach/ai-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildersFor = (table: string) =>
  getBuilders().filter((b) => b.__table === table);

const callOn = (
  builder: ReturnType<typeof getBuilders>[number],
  method: string,
) => {
  const entry = (builder.__calls as { method: string; args: unknown[] }[]).find(
    (c) => c.method === method,
  );
  return entry ?? null;
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = { id: "user-1", email: "test@example.com" };

const mockProfile = {
  primary_goal: "hipertrofia",
  secondary_goal: "fuerza",
  goal: "Ganar masa muscular",
  goal_notes: "Sin lesiones",
  experience_level: "intermediate",
  weekly_session_target: 3,
  weight_kg: 75,
  age: 28,
};

const recentSession = {
  id: "session-1",
  name: "Pecho",
  routine_id: "routine-1",
  started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  ended_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockSessions = [recentSession];

const mockRoutines = [
  {
    id: "routine-1",
    name: "Push",
    description: "Empuje",
    day_of_week: 1,
    routine_exercises: [
      {
        id: "re-1",
        exercise_id: "ex-1",
        target_sets: 4,
        target_reps: 8,
        target_weight_kg: 80,
        target_duration_seconds: null,
        exercises: { name: "Press de banca" },
      },
      {
        id: "re-2",
        exercise_id: "ex-2",
        target_sets: 3,
        target_reps: 10,
        target_weight_kg: 60,
        target_duration_seconds: null,
        exercises: { name: "Press inclinado" },
      },
    ],
  },
];

// Volumen vacío y PRs vacíos para simplificar fetchUserContextForAI
const emptyVolume = { data: [], error: null };
const emptyPrs = { data: [], error: null };

const mockFeedback: WeeklyFeedback = {
  motivationalMessage: "¡Vas muy bien!",
  adherenceScore: 8,
  adherenceAnalysis: "Has completado 3 sesiones de las 3 objetivo.",
  volumeAnalysis: "Volumen estable esta semana.",
  weekPlan: [
    {
      dayOfWeek: 1,
      routineId: "routine-1",
      routineName: "Push",
      focus: "Fuerza",
      advice: "Sube 2.5 kg en press de banca.",
    },
    {
      dayOfWeek: 2,
      routineId: null,
      routineName: null,
      focus: "Descanso",
      advice: null,
    },
  ],
  routineRecommendations: [
    {
      routineExerciseId: "re-1",
      routineId: "routine-1",
      exerciseName: "Press de banca",
      kind: "increase_weight",
      rationale: "Has alcanzado el objetivo de reps durante 2 semanas.",
      proposed: {
        target_sets: null,
        target_reps: null,
        target_weight_kg: 82.5,
        target_duration_seconds: null,
        notes: null,
      },
    },
  ],
  overallReport: "Buen trabajo esta semana. Mantén la constancia.",
};

// Secuencia de resultados para fetchUserContextForAI (5 queries en paralelo):
// profiles, sessions, routines, sets(volumen), sets(PRs)
const setupFetchContext = () => {
  setQueryResult(
    { data: mockProfile, error: null },   // profiles
    { data: mockSessions, error: null },  // sessions
    { data: mockRoutines, error: null },  // routines
    emptyVolume,                          // sets(volumen)
    emptyPrs,                             // sets(PRs)
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  resetBuilders();
  supabaseMock.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
});

// ─── fetchUserContextForAI ────────────────────────────────────────────────────

describe("fetchUserContextForAI", () => {
  it("devuelve null si no hay usuario autenticado", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await fetchUserContextForAI();

    expect(result).toBeNull();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("devuelve null si falla la query de perfil", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setQueryResult(
      { data: null, error: { message: "column not found" } }, // profiles
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
    );

    const result = await fetchUserContextForAI();

    expect(result).toBeNull();
  });

  it("devuelve perfil, sesiones y rutinas mapeadas correctamente", async () => {
    setupFetchContext();

    const result = await fetchUserContextForAI();

    expect(result).not.toBeNull();
    expect(result!.profile.primary_goal).toBe("hipertrofia");
    expect(result!.recentSessions).toHaveLength(1);
    expect(result!.routines).toHaveLength(1);
  });

  it("incluye el id del routine_exercise en cada ejercicio", async () => {
    setupFetchContext();

    const result = await fetchUserContextForAI();

    expect(result!.routines[0].exercises[0].id).toBe("re-1");
    expect(result!.routines[0].exercises[1].id).toBe("re-2");
  });

  it("mapea el nombre del ejercicio desde el join", async () => {
    setupFetchContext();

    const result = await fetchUserContextForAI();

    expect(result!.routines[0].exercises[0].exercise_name).toBe("Press de banca");
  });

  it("filtra sesiones de los últimos 14 días con gte", async () => {
    setupFetchContext();

    await fetchUserContextForAI();

    const sessionBuilder = buildersFor("sessions")[0];
    const gteCall = callOn(sessionBuilder, "gte");
    expect(gteCall?.args[0]).toBe("created_at");
    // la fecha debe estar dentro del rango de 14 días
    const cutoff = new Date(gteCall?.args[1] as string).getTime();
    expect(Date.now() - cutoff).toBeCloseTo(14 * 24 * 60 * 60 * 1000, -5);
  });

  it("limita las sesiones a 20", async () => {
    setupFetchContext();

    await fetchUserContextForAI();

    const sessionBuilder = buildersFor("sessions")[0];
    expect(callOn(sessionBuilder, "limit")?.args).toEqual([20]);
  });

  it("agrega el volumen de fuerza por día correctamente", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const sets = [
      { weight_kg: 100, reps: 5, created_at: `${today}T10:00:00Z`, exercises: { type: "strength" } },
      { weight_kg: 80, reps: 8, created_at: `${today}T10:30:00Z`, exercises: { type: "strength" } },
    ];
    setQueryResult(
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      { data: sets, error: null }, // volumen
      emptyPrs,
    );

    const result = await fetchUserContextForAI();

    expect(result!.weeklyVolume).toHaveLength(1);
    expect(result!.weeklyVolume[0].date).toBe(today);
    expect(result!.weeklyVolume[0].volume_kg).toBe(100 * 5 + 80 * 8); // 1140
  });
});

// ─── getCachedFeedback ────────────────────────────────────────────────────────

describe("getCachedFeedback", () => {
  it("devuelve null si no hay usuario autenticado", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getCachedFeedback();

    expect(result).toBeNull();
  });

  it("devuelve null si no hay ningún insight guardado", async () => {
    setQueryResult({ data: null, error: null });

    const result = await getCachedFeedback();

    expect(result).toBeNull();
  });

  it("devuelve el insight con isStale=false si tiene menos de 7 días", async () => {
    const recentDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // hace 1h
    setQueryResult({
      data: {
        id: "insight-1",
        feedback: mockFeedback,
        created_at: recentDate,
        applied_recommendations: [],
      },
      error: null,
    });

    const result = await getCachedFeedback();

    expect(result).not.toBeNull();
    expect(result!.id).toBe("insight-1");
    expect(result!.isStale).toBe(false);
    expect(result!.applied_recommendations).toEqual([]);
  });

  it("devuelve el insight con isStale=true si tiene más de 7 días", async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    setQueryResult({
      data: {
        id: "insight-2",
        feedback: mockFeedback,
        created_at: oldDate,
        applied_recommendations: [0],
      },
      error: null,
    });

    const result = await getCachedFeedback();

    expect(result!.isStale).toBe(true);
    expect(result!.applied_recommendations).toEqual([0]);
  });

  it("consulta ai_insights ordenado por created_at descendente y limit 1", async () => {
    setQueryResult({ data: null, error: null });

    await getCachedFeedback();

    const builder = buildersFor("ai_insights")[0];
    expect(callOn(builder, "order")?.args).toEqual(["created_at", { ascending: false }]);
    expect(callOn(builder, "limit")?.args).toEqual([1]);
  });
});

// ─── generateWeeklyFeedback ───────────────────────────────────────────────────

describe("generateWeeklyFeedback", () => {
  it("devuelve unauthenticated si no hay usuario", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("devuelve el insight cacheado sin llamar a la IA si tiene menos de 7 días", async () => {
    const recentDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    setQueryResult({
      data: {
        id: "insight-1",
        feedback: mockFeedback,
        created_at: recentDate,
        applied_recommendations: [],
      },
      error: null,
    });

    const result = await generateWeeklyFeedback();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.insight.feedback).toEqual(mockFeedback);
      expect(result.insight.isStale).toBe(false);
    }
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("llama a la IA si el caché tiene más de 7 días", async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: { id: "old", feedback: mockFeedback, created_at: oldDate, applied_recommendations: [] }, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
      { data: { id: "new-insight", created_at: new Date().toISOString() }, error: null },
    );

    const result = await generateWeeklyFeedback();

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it("llama a la IA si no hay caché", async () => {
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: null, error: null }, // sin caché
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
      { data: { id: "new-insight", created_at: new Date().toISOString() }, error: null },
    );

    const result = await generateWeeklyFeedback();

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it("devuelve incomplete_profile si falta edad, peso u objetivo", async () => {
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    const incompleteProfile = { ...mockProfile, age: null, weight_kg: null, primary_goal: null, goal: null };
    setQueryResult(
      { data: null, error: null },
      { data: incompleteProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
    );

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: false, reason: "incomplete_profile" });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("devuelve insufficient_data si no hay sesiones en los últimos 7 días", async () => {
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    const oldSession = {
      ...recentSession,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: [oldSession], error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
    );

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: false, reason: "insufficient_data" });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("filtra recomendaciones con routineExerciseId ajeno al usuario", async () => {
    const feedbackWithInvalidRec: WeeklyFeedback = {
      ...mockFeedback,
      routineRecommendations: [
        ...mockFeedback.routineRecommendations,
        {
          routineExerciseId: "re-AJENO",  // no pertenece al usuario
          routineId: "routine-1",
          exerciseName: "Ejercicio ajeno",
          kind: "increase_weight",
          rationale: "El modelo inventó este id.",
          proposed: {
            target_sets: null,
            target_reps: null,
            target_weight_kg: 100,
            target_duration_seconds: null,
            notes: null,
          },
        },
      ],
    };

    generateTextMock.mockResolvedValue({ output: feedbackWithInvalidRec });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
      { data: { id: "new-insight", created_at: new Date().toISOString() }, error: null },
    );

    const result = await generateWeeklyFeedback();

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Solo re-1 es válido; re-AJENO debe haber sido filtrado
      expect(result.insight.feedback.routineRecommendations).toHaveLength(1);
      expect(result.insight.feedback.routineRecommendations[0].routineExerciseId).toBe("re-1");
    }
  });

  it("filtra recomendaciones con routineId ajeno al usuario", async () => {
    const feedbackWithBadRoutine: WeeklyFeedback = {
      ...mockFeedback,
      routineRecommendations: [
        {
          ...mockFeedback.routineRecommendations[0],
          routineId: "routine-AJENA",
        },
      ],
    };

    generateTextMock.mockResolvedValue({ output: feedbackWithBadRoutine });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
      { data: { id: "new-insight", created_at: new Date().toISOString() }, error: null },
    );

    const result = await generateWeeklyFeedback();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.insight.feedback.routineRecommendations).toHaveLength(0);
    }
  });

  it("devuelve error si el modelo falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateTextMock.mockRejectedValue(new Error("API error"));

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
    );

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: false, reason: "error" });
  });

  it("el prompt incluye el objetivo principal del usuario", async () => {
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
      { data: { id: "new-insight", created_at: new Date().toISOString() }, error: null },
    );

    await generateWeeklyFeedback();

    const { system } = generateTextMock.mock.calls[0][0];
    expect(system).toContain("hipertrofia");
    expect(system).toContain("75 kg");
    expect(system).toContain("28 años");
  });

  it("el prompt incluye los routine_exercise_id para que la IA pueda referenciarlos", async () => {
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
      { data: { id: "new-insight", created_at: new Date().toISOString() }, error: null },
    );

    await generateWeeklyFeedback();

    const { system } = generateTextMock.mock.calls[0][0];
    expect(system).toContain("re-1");
    expect(system).toContain("re-2");
  });

  it("guarda el feedback en ai_insights con applied_recommendations vacío", async () => {
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
      { data: { id: "new-insight", created_at: new Date().toISOString() }, error: null },
    );

    await generateWeeklyFeedback();

    const insightsBuilders = buildersFor("ai_insights");
    // El primer builder es el SELECT de caché; el segundo es el INSERT
    const insertBuilder = insightsBuilders[1];
    expect(callOn(insertBuilder, "insert")?.args[0]).toMatchObject({
      user_id: "user-1",
      applied_recommendations: [],
    });
  });

  it("devuelve error si el insert falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      emptyVolume,
      emptyPrs,
      { data: null, error: { message: "insert failed" } },
    );

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: false, reason: "error" });
  });
});

// ─── applyRoutineRecommendation ───────────────────────────────────────────────

describe("applyRoutineRecommendation", () => {
  const insightId = "insight-1";

  const mockInsight = {
    id: insightId,
    feedback: mockFeedback,
    applied_recommendations: [],
  };

  it("devuelve unauthenticated si no hay usuario", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("devuelve insight_not_found si el insight no existe o no pertenece al usuario", async () => {
    setQueryResult({ data: null, error: { message: "not found" } });

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: false, reason: "insight_not_found" });
  });

  it("devuelve already_applied si la recomendación ya fue aplicada", async () => {
    setQueryResult({
      data: { ...mockInsight, applied_recommendations: [0] },
      error: null,
    });

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: false, reason: "already_applied" });
  });

  it("devuelve invalid_index si el índice no existe en el feedback", async () => {
    setQueryResult({ data: mockInsight, error: null });

    const result = await applyRoutineRecommendation(insightId, 99);

    expect(result).toEqual({ ok: false, reason: "invalid_index" });
  });

  it("devuelve exercise_not_found si el routine_exercise no pertenece al usuario (RLS vía join)", async () => {
    setQueryResult(
      { data: mockInsight, error: null },          // insight
      { data: null, error: { message: "not found" } }, // routine_exercises
    );

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: false, reason: "exercise_not_found" });
  });

  it("aplica increase_weight actualizando target_weight_kg en routine_exercises", async () => {
    const reData = { id: "re-1", routine_id: "routine-1" };
    setQueryResult(
      { data: mockInsight, error: null },  // insight
      { data: reData, error: null },       // routine_exercises verify
      { data: null, error: null },         // update routine_exercises
      { data: null, error: null },         // update ai_insights (mark applied)
    );

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: true });
    const reBuilder = buildersFor("routine_exercises")[1]; // [0] es el SELECT verify
    expect(callOn(reBuilder, "update")?.args[0]).toMatchObject({
      target_weight_kg: 82.5,
    });
  });

  it("aplica change_reps actualizando target_reps", async () => {
    const feedbackWithRepsRec: WeeklyFeedback = {
      ...mockFeedback,
      routineRecommendations: [
        {
          routineExerciseId: "re-1",
          routineId: "routine-1",
          exerciseName: "Press de banca",
          kind: "change_reps",
          rationale: "Más volumen de reps.",
          proposed: {
            target_sets: null,
            target_reps: 12,
            target_weight_kg: null,
            target_duration_seconds: null,
            notes: null,
          },
        },
      ],
    };

    setQueryResult(
      { data: { ...mockInsight, feedback: feedbackWithRepsRec }, error: null },
      { data: { id: "re-1", routine_id: "routine-1" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: true });
    const reBuilder = buildersFor("routine_exercises")[1];
    expect(callOn(reBuilder, "update")?.args[0]).toMatchObject({ target_reps: 12 });
  });

  it("aplica change_sets actualizando target_sets", async () => {
    const feedbackWithSetsRec: WeeklyFeedback = {
      ...mockFeedback,
      routineRecommendations: [
        {
          routineExerciseId: "re-1",
          routineId: "routine-1",
          exerciseName: "Press de banca",
          kind: "change_sets",
          rationale: "Más series para más volumen.",
          proposed: {
            target_sets: 5,
            target_reps: null,
            target_weight_kg: null,
            target_duration_seconds: null,
            notes: null,
          },
        },
      ],
    };

    setQueryResult(
      { data: { ...mockInsight, feedback: feedbackWithSetsRec }, error: null },
      { data: { id: "re-1", routine_id: "routine-1" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: true });
    const reBuilder = buildersFor("routine_exercises")[1];
    expect(callOn(reBuilder, "update")?.args[0]).toMatchObject({ target_sets: 5 });
  });

  it("aplica add_note actualizando notes sin tocar sets/reps/weight", async () => {
    const feedbackWithNote: WeeklyFeedback = {
      ...mockFeedback,
      routineRecommendations: [
        {
          routineExerciseId: "re-1",
          routineId: "routine-1",
          exerciseName: "Press de banca",
          kind: "add_note",
          rationale: "Añadir indicación técnica.",
          proposed: {
            target_sets: null,
            target_reps: null,
            target_weight_kg: null,
            target_duration_seconds: null,
            notes: "Controla la bajada en 3 segundos.",
          },
        },
      ],
    };

    setQueryResult(
      { data: { ...mockInsight, feedback: feedbackWithNote }, error: null },
      { data: { id: "re-1", routine_id: "routine-1" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: true });
    const reBuilder = buildersFor("routine_exercises")[1];
    expect(callOn(reBuilder, "update")?.args[0]).toMatchObject({
      notes: "Controla la bajada en 3 segundos.",
    });
  });

  it("replace_exercise y remove se marcan como aplicados sin modificar routine_exercises", async () => {
    const feedbackWithReplace: WeeklyFeedback = {
      ...mockFeedback,
      routineRecommendations: [
        {
          routineExerciseId: "re-1",
          routineId: "routine-1",
          exerciseName: "Press de banca",
          kind: "replace_exercise",
          rationale: "Cambio por press inclinado.",
          proposed: {
            target_sets: null,
            target_reps: null,
            target_weight_kg: null,
            target_duration_seconds: null,
            notes: null,
          },
        },
      ],
    };

    setQueryResult(
      { data: { ...mockInsight, feedback: feedbackWithReplace }, error: null },
      { data: { id: "re-1", routine_id: "routine-1" }, error: null },
      // NO hay update de routine_exercises — solo el update de ai_insights
      { data: null, error: null },
    );

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: true });
    const reBuilders = buildersFor("routine_exercises");
    // Solo debe haber un builder (el SELECT de verificación), no el UPDATE
    expect(reBuilders).toHaveLength(1);
  });

  it("marca la recomendación como aplicada en ai_insights", async () => {
    const reData = { id: "re-1", routine_id: "routine-1" };
    setQueryResult(
      { data: mockInsight, error: null },
      { data: reData, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    await applyRoutineRecommendation(insightId, 0);

    // [0] es el SELECT del insight; [1] es el UPDATE de mark-as-applied
    const insightsBuilders = buildersFor("ai_insights");
    const markBuilder = insightsBuilders.find((b) =>
      (b.__calls as { method: string; args: unknown[] }[]).some((c) => c.method === "update"),
    );
    expect(callOn(markBuilder!, "update")?.args[0]).toMatchObject({
      applied_recommendations: [0],
    });
    expect(callOn(markBuilder!, "eq")?.args).toEqual(["id", insightId]);
  });

  it("llama a revalidatePath en /coach y /rutinas tras aplicar", async () => {
    setQueryResult(
      { data: mockInsight, error: null },
      { data: { id: "re-1", routine_id: "routine-1" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    await applyRoutineRecommendation(insightId, 0);

    expect(revalidatePathMock).toHaveBeenCalledWith("/coach");
    expect(revalidatePathMock).toHaveBeenCalledWith("/rutinas");
  });

  it("devuelve update_failed si falla el update de routine_exercises", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setQueryResult(
      { data: mockInsight, error: null },
      { data: { id: "re-1", routine_id: "routine-1" }, error: null },
      { data: null, error: { message: "constraint violation" } }, // update falla
    );

    const result = await applyRoutineRecommendation(insightId, 0);

    expect(result).toEqual({ ok: false, reason: "update_failed" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
