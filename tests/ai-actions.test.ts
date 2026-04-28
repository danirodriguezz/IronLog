import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

type QueryResult = {
  data?: unknown;
  error?: { message: string } | null;
};

const {
  supabaseMock,
  setQueryResult,
  getBuilders,
  resetBuilders,
  generateTextMock,
} = vi.hoisted(() => {
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
    "eq", "neq", "in", "order", "limit", "returns",
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

  return { supabaseMock, setQueryResult, getBuilders, resetBuilders, generateTextMock };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

vi.mock("ai", () => ({
  generateText: generateTextMock,
  Output: {
    object: vi.fn((opts: unknown) => opts),
  },
}));

vi.mock("@ai-sdk/groq", () => ({
  createGroq: vi.fn(() => vi.fn((model: string) => ({ model }))),
}));

import {
  fetchUserContextForAI,
  generateWeeklyFeedback,
  type WeeklyFeedback,
} from "@/app/(app)/progreso/ai-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildersFor = (table: string) =>
  getBuilders().filter((b) => b.__table === table);

const callOn = (
  builder: ReturnType<typeof getBuilders>[number],
  method: string,
) => {
  const entry = (
    builder.__calls as { method: string; args: unknown[] }[]
  ).find((c) => c.method === method);
  return entry ?? null;
};

const mockUser = { id: "user-1", email: "test@example.com" };

const mockProfile = {
  goal: "Ganar masa muscular",
  experience_level: "intermediate",
  weight_kg: 75,
  age: 28,
};

const mockSessions = [
  {
    id: "session-1",
    name: "Pecho y tríceps",
    status: "completed",
    started_at: "2026-04-21T10:00:00Z",
    ended_at: "2026-04-21T11:00:00Z",
    created_at: "2026-04-21T10:00:00Z",
  },
  {
    id: "session-2",
    name: "Espalda y bíceps",
    status: "completed",
    started_at: "2026-04-23T10:00:00Z",
    ended_at: "2026-04-23T11:30:00Z",
    created_at: "2026-04-23T10:00:00Z",
  },
];

const mockRoutines = [
  {
    id: "routine-1",
    name: "Push",
    description: "Empuje",
    day_of_week: 1,
    routine_exercises: [
      {
        exercise_id: "ex-1",
        target_sets: 4,
        target_reps: 8,
        target_weight_kg: 80,
        target_duration_seconds: null,
        exercises: { name: "Press de banca" },
      },
    ],
  },
];

const mockFeedback: WeeklyFeedback = {
  motivationalMessage: "¡Vas muy bien esta semana!",
  volumeAnalysis: "Has entrenado 2 sesiones con buena intensidad.",
  nextSessionAdvice: "Sube 2.5 kg en press de banca.",
  adherenceScore: 8,
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

  it("devuelve null y loguea error si falla la query de perfil", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    setQueryResult(
      { data: null, error: { message: "column does not exist" } }, // profiles
      { data: mockSessions, error: null },                          // sessions
      { data: mockRoutines, error: null },                          // routines
    );

    const result = await fetchUserContextForAI();

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[fetchUserContextForAI] profile:",
      "column does not exist",
    );

    consoleSpy.mockRestore();
  });

  it("devuelve el contexto completo con perfil, sesiones y rutinas", async () => {
    setQueryResult(
      { data: mockProfile, error: null },   // profiles
      { data: mockSessions, error: null },  // sessions
      { data: mockRoutines, error: null },  // routines
    );

    const result = await fetchUserContextForAI();

    expect(result).not.toBeNull();
    expect(result!.profile).toEqual(mockProfile);
    expect(result!.recentSessions).toHaveLength(2);
    expect(result!.routines).toHaveLength(1);
  });

  it("mapea correctamente los nombres de ejercicios desde el join", async () => {
    setQueryResult(
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
    );

    const result = await fetchUserContextForAI();

    expect(result!.routines[0].exercises[0].exercise_name).toBe("Press de banca");
    expect(result!.routines[0].exercises[0].target_sets).toBe(4);
  });

  it("devuelve arrays vacíos si sesiones y rutinas fallan", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    setQueryResult(
      { data: mockProfile, error: null },
      { data: null, error: { message: "error sesiones" } },
      { data: null, error: { message: "error rutinas" } },
    );

    const result = await fetchUserContextForAI();

    expect(result).not.toBeNull();
    expect(result!.recentSessions).toEqual([]);
    expect(result!.routines).toEqual([]);
  });

  it("ordena las sesiones por created_at descendente", async () => {
    setQueryResult(
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
    );

    await fetchUserContextForAI();

    const sessionBuilder = buildersFor("sessions")[0];
    expect(callOn(sessionBuilder, "order")?.args).toEqual([
      "created_at",
      { ascending: false },
    ]);
  });

  it("limita las sesiones a 5", async () => {
    setQueryResult(
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
    );

    await fetchUserContextForAI();

    const sessionBuilder = buildersFor("sessions")[0];
    expect(callOn(sessionBuilder, "limit")?.args).toEqual([5]);
  });

  it("filtra el perfil por el id del usuario autenticado", async () => {
    setQueryResult(
      { data: mockProfile, error: null },
      { data: [], error: null },
      { data: [], error: null },
    );

    await fetchUserContextForAI();

    const profileBuilder = buildersFor("profiles")[0];
    expect(callOn(profileBuilder, "eq")?.args).toEqual(["id", "user-1"]);
  });
});

// ─── generateWeeklyFeedback ───────────────────────────────────────────────────

describe("generateWeeklyFeedback", () => {
  it("devuelve null si no hay usuario autenticado", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("devuelve el feedback cacheado si tiene menos de 7 días", async () => {
    const recentDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // hace 1h

    setQueryResult(
      { data: { feedback: mockFeedback, created_at: recentDate }, error: null }, // caché
    );

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: true, feedback: mockFeedback });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("llama a la IA si el caché tiene más de 7 días", async () => {
    const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(); // hace 8 días

    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: { feedback: mockFeedback, created_at: oldDate }, error: null }, // caché viejo
      { data: mockProfile, error: null },   // profiles (fetchUserContextForAI)
      { data: mockSessions, error: null },  // sessions
      { data: mockRoutines, error: null },  // routines
      { data: null, error: null },          // insert en ai_insights
    );

    const result = await generateWeeklyFeedback();

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, feedback: mockFeedback });
  });

  it("llama a la IA si no hay caché", async () => {
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: null, error: null },          // sin caché
      { data: mockProfile, error: null },   // profiles
      { data: mockSessions, error: null },  // sessions
      { data: mockRoutines, error: null },  // routines
      { data: null, error: null },          // insert en ai_insights
    );

    const result = await generateWeeklyFeedback();

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, feedback: mockFeedback });
  });

  it("guarda el feedback en ai_insights tras llamar a la IA", async () => {
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      { data: null, error: null },
    );

    await generateWeeklyFeedback();

    const insightsBuilder = buildersFor("ai_insights")[1]; // [0] es el SELECT de caché
    expect(callOn(insightsBuilder, "insert")?.args[0]).toMatchObject({
      user_id: "user-1",
      feedback: mockFeedback,
    });
  });

  it("devuelve el feedback aunque falle el insert en ai_insights", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    generateTextMock.mockResolvedValue({ output: mockFeedback });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      { data: null, error: { message: "insert failed" } },
    );

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: true, feedback: mockFeedback });
    expect(consoleSpy).toHaveBeenCalledWith(
      "[generateWeeklyFeedback] insert:",
      "insert failed",
    );

    consoleSpy.mockRestore();
  });

  it("devuelve error si fetchUserContextForAI devuelve null", async () => {
    // Sin caché y el perfil falla
    vi.spyOn(console, "error").mockImplementation(() => {});

    setQueryResult(
      { data: null, error: null },                                     // sin caché
      { data: null, error: { message: "profile error" } },            // profiles falla
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
    );

    const result = await generateWeeklyFeedback();

    expect(result).toEqual({ ok: false, reason: "error" });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("el prompt del sistema incluye los datos del perfil", async () => {
    generateTextMock.mockResolvedValue({ experimental_output: mockFeedback });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      { data: null, error: null },
    );

    await generateWeeklyFeedback();

    const callArgs = generateTextMock.mock.calls[0][0];
    expect(callArgs.system).toContain("Ganar masa muscular");
    expect(callArgs.system).toContain("intermediate");
    expect(callArgs.system).toContain("75 kg");
    expect(callArgs.system).toContain("28 años");
  });

  it("el prompt del sistema incluye los nombres de las rutinas", async () => {
    generateTextMock.mockResolvedValue({ experimental_output: mockFeedback });

    setQueryResult(
      { data: null, error: null },
      { data: mockProfile, error: null },
      { data: mockSessions, error: null },
      { data: mockRoutines, error: null },
      { data: null, error: null },
    );

    await generateWeeklyFeedback();

    const callArgs = generateTextMock.mock.calls[0][0];
    expect(callArgs.system).toContain("Push");
    expect(callArgs.system).toContain("Press de banca");
  });

  it("consulta ai_insights ordenado por created_at descendente", async () => {
    setQueryResult({ data: mockFeedback, error: null });

    // Simula caché reciente para que no llegue a la IA
    const recentDate = new Date().toISOString();
    setQueryResult({ data: { feedback: mockFeedback, created_at: recentDate }, error: null });
    resetBuilders();
    setQueryResult({ data: { feedback: mockFeedback, created_at: recentDate }, error: null });

    await generateWeeklyFeedback();

    const insightsBuilder = buildersFor("ai_insights")[0];
    expect(callOn(insightsBuilder, "order")?.args).toEqual([
      "created_at",
      { ascending: false },
    ]);
    expect(callOn(insightsBuilder, "limit")?.args).toEqual([1]);
  });
});
