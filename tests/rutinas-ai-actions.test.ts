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
    "eq", "neq", "gte", "order", "limit", "returns",
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

  return { supabaseMock, setQueryResult, getBuilders, resetBuilders, generateTextMock, revalidatePathMock };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

vi.mock("ai", () => ({
  generateText: generateTextMock,
  Output: { object: vi.fn(({ schema }) => ({ type: "object", schema })) },
}));

vi.mock("@ai-sdk/groq", () => ({
  createGroq: vi.fn(() => vi.fn((model: string) => ({ model }))),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

// fetchUserContextForAI is called by generateRoutinePlan — we stub it to keep
// tests focused on the rutinas AI actions, not on the coach context fetch.
vi.mock("@/app/(app)/coach/ai-actions", () => ({
  fetchUserContextForAI: vi.fn(),
}));

import { fetchUserContextForAI } from "@/app/(app)/coach/ai-actions";
import { generateRoutinePlan, applyAIRoutinePlan, type AIRoutinePlan, type CatalogEntry } from "@/app/(app)/rutinas/ai-actions";

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

const mockUser = { id: "user-1" };

const mockProfile = {
  primary_goal: "perder_grasa",
  secondary_goal: null,
  goal: "Definición",
  goal_notes: null,
  experience_level: "intermediate",
  weekly_session_target: 4,
  weight_kg: 78,
  age: 30,
};

const mockRoutines = [
  {
    id: "routine-1",
    name: "Push",
    description: null,
    day_of_week: 1,
    exercises: [
      {
        id: "re-1",
        exercise_id: "ex-1",
        exercise_name: "Press de banca",
        target_sets: 4,
        target_reps: 8,
        target_weight_kg: 80,
        target_duration_seconds: null,
      },
      {
        id: "re-2",
        exercise_id: "ex-2",
        exercise_name: "Press inclinado",
        target_sets: 3,
        target_reps: 10,
        target_weight_kg: 60,
        target_duration_seconds: null,
      },
    ],
  },
  {
    id: "routine-2",
    name: "Pull",
    description: null,
    day_of_week: 3,
    exercises: [
      {
        id: "re-3",
        exercise_id: "ex-3",
        exercise_name: "Dominadas",
        target_sets: 3,
        target_reps: 8,
        target_weight_kg: null,
        target_duration_seconds: null,
      },
    ],
  },
];

const mockCatalog: CatalogEntry[] = [
  { id: "ex-1", name: "Press de banca", target_muscle: "Pecho", type: "strength" },
  { id: "ex-2", name: "Press inclinado", target_muscle: "Pecho", type: "strength" },
  { id: "ex-3", name: "Dominadas", target_muscle: "Espalda", type: "bodyweight" },
  { id: "ex-4", name: "Cardio HIIT", target_muscle: "Cardio", type: "cardio" },
];

const mockAIContext = {
  profile: mockProfile,
  recentSessions: [],
  weeklyVolume: [],
  routines: mockRoutines,
  recentPrs: [],
};

const basePlan: AIRoutinePlan = {
  summary: "Plan adaptado para definición.",
  modifications: [],
  additions: [],
  newRoutines: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  resetBuilders();
  supabaseMock.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  vi.mocked(fetchUserContextForAI).mockResolvedValue(mockAIContext);
});

// ─── generateRoutinePlan ──────────────────────────────────────────────────────

describe("generateRoutinePlan", () => {
  it("devuelve unauthenticated si no hay sesión", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await generateRoutinePlan("quiero definir");

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("devuelve no_routines si el usuario no tiene rutinas", async () => {
    vi.mocked(fetchUserContextForAI).mockResolvedValue({
      ...mockAIContext,
      routines: [],
    });
    // catalog query result
    setQueryResult({ data: mockCatalog, error: null });

    const result = await generateRoutinePlan("quiero definir");

    expect(result).toEqual({ ok: false, reason: "no_routines" });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("devuelve error si fetchUserContextForAI falla", async () => {
    vi.mocked(fetchUserContextForAI).mockResolvedValue(null);
    setQueryResult({ data: mockCatalog, error: null });

    const result = await generateRoutinePlan("quiero definir");

    expect(result).toEqual({ ok: false, reason: "error" });
  });

  it("llama a generateText con el sistema en español y el objetivo del usuario", async () => {
    generateTextMock.mockResolvedValue({ output: basePlan });
    setQueryResult({ data: mockCatalog, error: null });

    await generateRoutinePlan("quiero definición y perder grasa");

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const call = generateTextMock.mock.calls[0][0];
    expect(call.system).toContain("perder_grasa");
    expect(call.prompt).toContain("quiero definición y perder grasa");
  });

  it("incluye los IDs de routine_exercise en el prompt para que el modelo los use", async () => {
    generateTextMock.mockResolvedValue({ output: basePlan });
    setQueryResult({ data: mockCatalog, error: null });

    await generateRoutinePlan("más cardio");

    const { system } = generateTextMock.mock.calls[0][0];
    expect(system).toContain("re-1");
    expect(system).toContain("re-2");
    expect(system).toContain("re-3");
  });

  it("incluye el catálogo agrupado por músculo en el prompt", async () => {
    generateTextMock.mockResolvedValue({ output: basePlan });
    setQueryResult({ data: mockCatalog, error: null });

    await generateRoutinePlan("más cardio");

    const { system } = generateTextMock.mock.calls[0][0];
    expect(system).toContain("Pecho");
    expect(system).toContain("Press de banca");
    expect(system).toContain("Cardio HIIT");
  });

  it("cuando se pasa focusRoutineId, solo incluye esa rutina en el prompt", async () => {
    generateTextMock.mockResolvedValue({ output: basePlan });
    setQueryResult({ data: mockCatalog, error: null });

    await generateRoutinePlan("optimizar esta rutina", "routine-1");

    const { system } = generateTextMock.mock.calls[0][0];
    expect(system).toContain("routine-1");
    // routine-2 no debe estar en el resumen de rutinas
    expect(system).not.toContain("routine-2");
  });

  it("filtra modifications con routineExerciseId ajeno al usuario", async () => {
    const planWithBadId: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-AJENO",
          exerciseName: "Ejercicio ajeno",
          kind: "increase_weight",
          rationale: "El modelo inventó este id.",
          proposed: { target_sets: null, target_reps: null, target_weight_kg: 100, target_duration_seconds: null, notes: null },
        },
        {
          routineExerciseId: "re-1",
          exerciseName: "Press de banca",
          kind: "increase_weight",
          rationale: "Superando meseta.",
          proposed: { target_sets: null, target_reps: null, target_weight_kg: 85, target_duration_seconds: null, notes: null },
        },
      ],
    };
    generateTextMock.mockResolvedValue({ output: planWithBadId });
    setQueryResult({ data: mockCatalog, error: null });

    const result = await generateRoutinePlan("definición");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.modifications).toHaveLength(1);
      expect(result.plan.modifications[0].routineExerciseId).toBe("re-1");
    }
  });

  it("filtra additions con routineId ajeno al usuario", async () => {
    const planWithBadRoutine: AIRoutinePlan = {
      ...basePlan,
      additions: [
        {
          routineId: "routine-AJENA",
          exerciseName: "Cardio HIIT",
          rationale: "Más cardio.",
          target_sets: null, target_reps: null, target_weight_kg: null,
          target_duration_seconds: 1800, notes: null,
        },
        {
          routineId: "routine-1",
          exerciseName: "Cardio HIIT",
          rationale: "Más cardio.",
          target_sets: null, target_reps: null, target_weight_kg: null,
          target_duration_seconds: 1800, notes: null,
        },
      ],
    };
    generateTextMock.mockResolvedValue({ output: planWithBadRoutine });
    setQueryResult({ data: mockCatalog, error: null });

    const result = await generateRoutinePlan("definición");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.additions).toHaveLength(1);
      expect(result.plan.additions[0].routineId).toBe("routine-1");
    }
  });

  it("devuelve el catalogSnapshot junto al plan para usarlo al aplicar", async () => {
    generateTextMock.mockResolvedValue({ output: basePlan });
    setQueryResult({ data: mockCatalog, error: null });

    const result = await generateRoutinePlan("definición");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.catalogSnapshot).toEqual(mockCatalog);
    }
  });

  it("devuelve error si el modelo lanza excepción", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateTextMock.mockRejectedValue(new Error("timeout"));
    setQueryResult({ data: mockCatalog, error: null });

    const result = await generateRoutinePlan("definición");

    expect(result).toEqual({ ok: false, reason: "error" });
  });
});

// ─── applyAIRoutinePlan ───────────────────────────────────────────────────────

describe("applyAIRoutinePlan", () => {
  // Sequence of DB calls in applyAIRoutinePlan:
  // 1. routine_exercises SELECT (ownership validation)
  // 2. routines SELECT (ownership validation)
  // Then for each operation: varies by kind (see individual tests)

  type QueryResult = { data?: unknown; error?: { message: string } | null };

  const ownershipResults = (
    reIds: string[] = ["re-1", "re-2", "re-3"],
    routineIds: string[] = ["routine-1", "routine-2"],
  ): [QueryResult, QueryResult] => [
    { data: reIds.map((id) => ({ id })), error: null },
    { data: routineIds.map((id) => ({ id })), error: null },
  ];

  it("devuelve unauthenticated si no hay sesión", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await applyAIRoutinePlan(basePlan, mockCatalog);

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("retorna ok con stats vacíos cuando el plan no tiene cambios", async () => {
    setQueryResult(...ownershipResults());

    const result = await applyAIRoutinePlan(basePlan, mockCatalog);

    expect(result).toEqual({
      ok: true,
      stats: { modified: 0, added: 0, created: 0, removed: 0, unresolved: [] },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/rutinas");
    expect(revalidatePathMock).toHaveBeenCalledWith("/coach");
  });

  // ── modifications ──────────────────────────────────────────────────────────

  it("aplica increase_weight actualizando target_weight_kg en routine_exercises", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-1",
          exerciseName: "Press de banca",
          kind: "increase_weight",
          rationale: "Superando meseta.",
          proposed: { target_sets: null, target_reps: null, target_weight_kg: 85, target_duration_seconds: null, notes: null },
        },
      ],
    };
    setQueryResult(...ownershipResults(), { data: null, error: null }); // update RE

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stats.modified).toBe(1);

    const reBuilders = buildersFor("routine_exercises");
    const updateBuilder = reBuilders.find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "update"),
    )!;
    expect(callOn(updateBuilder, "update")?.args[0]).toMatchObject({ target_weight_kg: 85 });
    expect(callOn(updateBuilder, "eq")?.args).toEqual(["id", "re-1"]);
  });

  it("aplica decrease_weight actualizando target_weight_kg", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-1",
          exerciseName: "Press de banca",
          kind: "decrease_weight",
          rationale: "Ajuste técnico.",
          proposed: { target_sets: null, target_reps: null, target_weight_kg: 70, target_duration_seconds: null, notes: null },
        },
      ],
    };
    setQueryResult(...ownershipResults(), { data: null, error: null });

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    if (result.ok) expect(result.stats.modified).toBe(1);
    const reBuilders = buildersFor("routine_exercises");
    const updateBuilder = reBuilders.find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "update"),
    )!;
    expect(callOn(updateBuilder, "update")?.args[0]).toMatchObject({ target_weight_kg: 70 });
  });

  it("aplica change_reps actualizando target_reps", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-1",
          exerciseName: "Press de banca",
          kind: "change_reps",
          rationale: "Más reps para definición.",
          proposed: { target_sets: null, target_reps: 15, target_weight_kg: null, target_duration_seconds: null, notes: null },
        },
      ],
    };
    setQueryResult(...ownershipResults(), { data: null, error: null });

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    if (result.ok) expect(result.stats.modified).toBe(1);
    const updateBuilder = buildersFor("routine_exercises").find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "update"),
    )!;
    expect(callOn(updateBuilder, "update")?.args[0]).toMatchObject({ target_reps: 15 });
  });

  it("aplica change_sets actualizando target_sets", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-2",
          exerciseName: "Press inclinado",
          kind: "change_sets",
          rationale: "Más series.",
          proposed: { target_sets: 4, target_reps: null, target_weight_kg: null, target_duration_seconds: null, notes: null },
        },
      ],
    };
    setQueryResult(...ownershipResults(), { data: null, error: null });

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    if (result.ok) expect(result.stats.modified).toBe(1);
    const updateBuilder = buildersFor("routine_exercises").find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "update"),
    )!;
    expect(callOn(updateBuilder, "update")?.args[0]).toMatchObject({ target_sets: 4 });
  });

  it("aplica add_note actualizando notes", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-1",
          exerciseName: "Press de banca",
          kind: "add_note",
          rationale: "Indicación técnica.",
          proposed: { target_sets: null, target_reps: null, target_weight_kg: null, target_duration_seconds: null, notes: "Controla 3s bajada." },
        },
      ],
    };
    setQueryResult(...ownershipResults(), { data: null, error: null });

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    if (result.ok) expect(result.stats.modified).toBe(1);
    const updateBuilder = buildersFor("routine_exercises").find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "update"),
    )!;
    expect(callOn(updateBuilder, "update")?.args[0]).toMatchObject({ notes: "Controla 3s bajada." });
  });

  it("aplica remove eliminando la fila de routine_exercises", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-2",
          exerciseName: "Press inclinado",
          kind: "remove",
          rationale: "Ejercicio redundante.",
          proposed: { target_sets: null, target_reps: null, target_weight_kg: null, target_duration_seconds: null, notes: null },
        },
      ],
    };
    setQueryResult(...ownershipResults(), { data: null, error: null }); // delete RE

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.removed).toBe(1);
      expect(result.stats.modified).toBe(0);
    }
    const deleteBuilder = buildersFor("routine_exercises").find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "delete"),
    )!;
    expect(callOn(deleteBuilder, "eq")?.args).toEqual(["id", "re-2"]);
  });

  it("omite silenciosamente modificaciones con routineExerciseId ajeno", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-AJENO",
          exerciseName: "Ejercicio ajeno",
          kind: "increase_weight",
          rationale: "ID inventado.",
          proposed: { target_sets: null, target_reps: null, target_weight_kg: 100, target_duration_seconds: null, notes: null },
        },
      ],
    };
    // Ownership query: re-AJENO no está en la lista
    setQueryResult(
      { data: [{ id: "re-1" }, { id: "re-2" }], error: null },
      { data: [{ id: "routine-1" }], error: null },
    );

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stats.modified).toBe(0);
    // No debe haberse llamado a update en routine_exercises
    const updateBuilders = buildersFor("routine_exercises").filter((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "update"),
    );
    expect(updateBuilders).toHaveLength(0);
  });

  it("no aplica la modificación si proposed.target_weight_kg es null en increase_weight", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      modifications: [
        {
          routineExerciseId: "re-1",
          exerciseName: "Press de banca",
          kind: "increase_weight",
          rationale: "Sugerencia sin datos.",
          proposed: { target_sets: null, target_reps: null, target_weight_kg: null, target_duration_seconds: null, notes: null },
        },
      ],
    };
    setQueryResult(...ownershipResults());

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stats.modified).toBe(0);
  });

  // ── additions ──────────────────────────────────────────────────────────────

  it("añade ejercicio a una rutina existente resolviendo el nombre del catálogo", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      additions: [
        {
          routineId: "routine-1",
          exerciseName: "Cardio HIIT",
          rationale: "Más cardio para definición.",
          target_sets: null, target_reps: null, target_weight_kg: null,
          target_duration_seconds: 1800, notes: null,
        },
      ],
    };
    setQueryResult(
      ...ownershipResults(),
      { data: { order_index: 3 }, error: null }, // max order_index
      { data: null, error: null },               // insert
    );

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stats.added).toBe(1);

    const insertBuilder = buildersFor("routine_exercises").find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "insert"),
    )!;
    expect(callOn(insertBuilder, "insert")?.args[0]).toMatchObject({
      routine_id: "routine-1",
      exercise_id: "ex-4",  // resolved from "Cardio HIIT"
      order_index: 4,
      target_duration_seconds: 1800,
    });
  });

  it("usa order_index 0 cuando la rutina no tiene ejercicios", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      additions: [
        {
          routineId: "routine-1",
          exerciseName: "Cardio HIIT",
          rationale: "Cardio.",
          target_sets: null, target_reps: null, target_weight_kg: null,
          target_duration_seconds: 600, notes: null,
        },
      ],
    };
    setQueryResult(
      ...ownershipResults(),
      { data: null, error: null }, // max order_index maybeSingle returns null
      { data: null, error: null }, // insert
    );

    await applyAIRoutinePlan(plan, mockCatalog);

    const insertBuilder = buildersFor("routine_exercises").find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "insert"),
    )!;
    expect(callOn(insertBuilder, "insert")?.args[0]).toMatchObject({ order_index: 0 });
  });

  it("añade nombre al unresolved cuando el ejercicio no existe en el catálogo", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      additions: [
        {
          routineId: "routine-1",
          exerciseName: "Ejercicio Inventado",
          rationale: "No existe en catálogo.",
          target_sets: 3, target_reps: 10, target_weight_kg: null,
          target_duration_seconds: null, notes: null,
        },
      ],
    };
    setQueryResult(...ownershipResults());

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.added).toBe(0);
      expect(result.stats.unresolved).toContain("Ejercicio Inventado");
    }
  });

  it("ignora additions con routineId ajeno al usuario", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      additions: [
        {
          routineId: "routine-AJENA",
          exerciseName: "Press de banca",
          rationale: "Rutina ajena.",
          target_sets: 3, target_reps: 10, target_weight_kg: null,
          target_duration_seconds: null, notes: null,
        },
      ],
    };
    setQueryResult(
      { data: [{ id: "re-1" }], error: null },
      { data: [{ id: "routine-1" }], error: null }, // routine-AJENA no está
    );

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stats.added).toBe(0);
    const insertBuilders = buildersFor("routine_exercises").filter((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "insert"),
    );
    expect(insertBuilders).toHaveLength(0);
  });

  // ── newRoutines ────────────────────────────────────────────────────────────

  it("crea una nueva rutina con sus ejercicios", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      newRoutines: [
        {
          name: "Cardio y Core",
          description: "Sesión ligera.",
          day_of_week: 5,
          rationale: "Sesión extra para definición.",
          exercises: [
            { exerciseName: "Cardio HIIT", target_sets: null, target_reps: null, target_weight_kg: null, target_duration_seconds: 1800, notes: null },
            { exerciseName: "Press de banca", target_sets: 3, target_reps: 12, target_weight_kg: 60, target_duration_seconds: null, notes: null },
          ],
        },
      ],
    };
    setQueryResult(
      ...ownershipResults(),
      { data: null, error: null },                     // update day_of_week conflict clear
      { data: { id: "new-routine-id" }, error: null }, // routines insert
      { data: null, error: null },                     // routine_exercises insert #1
      { data: null, error: null },                     // routine_exercises insert #2
    );

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.created).toBe(1);
    }

    // Verify routines insert payload
    const routinesBuilder = buildersFor("routines").find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "insert"),
    )!;
    expect(callOn(routinesBuilder, "insert")?.args[0]).toMatchObject({
      user_id: "user-1",
      name: "Cardio y Core",
      description: "Sesión ligera.",
      day_of_week: 5,
    });

    // Verify two exercises were inserted into the new routine
    const reInsertBuilders = buildersFor("routine_exercises").filter((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "insert"),
    );
    expect(reInsertBuilders).toHaveLength(2);
    expect(callOn(reInsertBuilders[0], "insert")?.args[0]).toMatchObject({
      routine_id: "new-routine-id",
      exercise_id: "ex-4", // Cardio HIIT
      order_index: 0,
    });
    expect(callOn(reInsertBuilders[1], "insert")?.args[0]).toMatchObject({
      routine_id: "new-routine-id",
      exercise_id: "ex-1", // Press de banca
      order_index: 1,
    });
  });

  it("libera el conflicto de día antes de crear una rutina nueva con day_of_week", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      newRoutines: [
        {
          name: "Nueva rutina Lunes",
          description: null,
          day_of_week: 1, // lunes ya tiene Push asignado
          rationale: "Reemplaza Push.",
          exercises: [],
        },
      ],
    };
    setQueryResult(
      ...ownershipResults(),
      { data: null, error: null },               // day conflict clear
      { data: { id: "new-id" }, error: null },   // insert
    );

    await applyAIRoutinePlan(plan, mockCatalog);

    // Verify the UPDATE that clears the day conflict
    const routinesBuilders = buildersFor("routines");
    const clearBuilder = routinesBuilders.find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "update") &&
      (b.__calls as { method: string; args: unknown[] }[]).some(
        (c) => c.method === "eq" && c.args[0] === "day_of_week" && c.args[1] === 1,
      ),
    );
    expect(clearBuilder).toBeDefined();
  });

  it("no intenta limpiar el conflicto cuando day_of_week es null", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      newRoutines: [
        {
          name: "Rutina sin día",
          description: null,
          day_of_week: null,
          rationale: "Sin asignar.",
          exercises: [],
        },
      ],
    };
    setQueryResult(...ownershipResults(), { data: { id: "new-id" }, error: null }); // only the insert

    await applyAIRoutinePlan(plan, mockCatalog);

    // No UPDATE on routines for day clearing
    const updateBuilders = buildersFor("routines").filter((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "update"),
    );
    expect(updateBuilders).toHaveLength(0);
  });

  it("añade ejercicios no resueltos a unresolved en una rutina nueva", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      newRoutines: [
        {
          name: "Rutina nueva",
          description: null,
          day_of_week: null,
          rationale: "Con ejercicio inventado.",
          exercises: [
            { exerciseName: "Ejercicio Inventado", target_sets: 3, target_reps: 10, target_weight_kg: null, target_duration_seconds: null, notes: null },
          ],
        },
      ],
    };
    setQueryResult(...ownershipResults(), { data: { id: "new-id" }, error: null }); // insert routine (no exercise inserts expected)

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.unresolved).toContain("Ejercicio Inventado");
      expect(result.stats.created).toBe(1);
    }
  });

  // ── revalidatePath ─────────────────────────────────────────────────────────

  it("llama a revalidatePath en /rutinas y /coach tras aplicar cambios", async () => {
    setQueryResult(...ownershipResults());

    await applyAIRoutinePlan(basePlan, mockCatalog);

    expect(revalidatePathMock).toHaveBeenCalledWith("/rutinas");
    expect(revalidatePathMock).toHaveBeenCalledWith("/coach");
  });

  // ── resolution ─────────────────────────────────────────────────────────────

  it("resuelve nombres de ejercicio de forma case-insensitive", async () => {
    const plan: AIRoutinePlan = {
      ...basePlan,
      additions: [
        {
          routineId: "routine-1",
          exerciseName: "CARDIO HIIT", // uppercase — debe resolverse a ex-4
          rationale: "Cardio.",
          target_sets: null, target_reps: null, target_weight_kg: null,
          target_duration_seconds: 600, notes: null,
        },
      ],
    };
    setQueryResult(
      ...ownershipResults(),
      { data: null, error: null }, // maybeSingle for max order_index
      { data: null, error: null }, // insert
    );

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stats.added).toBe(1);

    const insertBuilder = buildersFor("routine_exercises").find((b) =>
      (b.__calls as { method: string }[]).some((c) => c.method === "insert"),
    )!;
    expect(callOn(insertBuilder, "insert")?.args[0]).toMatchObject({ exercise_id: "ex-4" });
  });

  // ── combined plan ──────────────────────────────────────────────────────────

  it("aplica un plan combinado: modificación + adición + nueva rutina y devuelve stats correctos", async () => {
    const plan: AIRoutinePlan = {
      summary: "Plan completo.",
      modifications: [
        {
          routineExerciseId: "re-1",
          exerciseName: "Press de banca",
          kind: "change_reps",
          rationale: "Más reps.",
          proposed: { target_sets: null, target_reps: 15, target_weight_kg: null, target_duration_seconds: null, notes: null },
        },
      ],
      additions: [
        {
          routineId: "routine-2",
          exerciseName: "Cardio HIIT",
          rationale: "Cardio.",
          target_sets: null, target_reps: null, target_weight_kg: null,
          target_duration_seconds: 1200, notes: null,
        },
      ],
      newRoutines: [
        {
          name: "Cardio Viernes",
          description: null,
          day_of_week: null,
          rationale: "Sesión extra.",
          exercises: [
            { exerciseName: "Cardio HIIT", target_sets: null, target_reps: null, target_weight_kg: null, target_duration_seconds: 1800, notes: null },
          ],
        },
      ],
    };
    setQueryResult(
      ...ownershipResults(),
      // new routine: no day conflict clear (day_of_week null), then insert + 1 exercise
      { data: { id: "new-routine-x" }, error: null }, // routines insert
      { data: null, error: null },                    // RE insert for new routine
      // addition: max order_index + insert
      { data: { order_index: 0 }, error: null },
      { data: null, error: null },
      // modification update
      { data: null, error: null },
    );

    const result = await applyAIRoutinePlan(plan, mockCatalog);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.created).toBe(1);
      expect(result.stats.added).toBe(1);
      expect(result.stats.modified).toBe(1);
      expect(result.stats.removed).toBe(0);
      expect(result.stats.unresolved).toHaveLength(0);
    }
  });
});
