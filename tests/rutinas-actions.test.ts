import { describe, it, expect, vi, beforeEach } from "vitest";

type QueryResult = {
  data?: unknown;
  error?: { message: string } | null;
};

const { redirectMock, revalidatePathMock, supabaseMock, setQueryResult, getLastBuilder } =
  vi.hoisted(() => {
    const redirectMock = vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
    const revalidatePathMock = vi.fn();

    // Fluent query-builder mock. Each `from()` returns a builder that captures
    // every call, and at the end resolves (via .then / await) to a queued result.
    type Call = { method: string; args: unknown[] };
    type Builder = Record<string, unknown> & {
      __calls: Call[];
      __table: string;
      then: (onFulfilled: (v: QueryResult) => unknown) => Promise<unknown>;
    };

    let nextResults: QueryResult[] = [];
    let lastBuilder: Builder | null = null;

    const setQueryResult = (...results: QueryResult[]) => {
      nextResults = [...results];
    };
    const getLastBuilder = () => lastBuilder;

    const chainedMethods = [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "order",
      "limit",
      "returns",
    ] as const;
    const terminalMethods = ["single", "maybeSingle"] as const;

    const makeBuilder = (table: string): Builder => {
      const calls: Call[] = [];
      const builder: Builder = {
        __calls: calls,
        __table: table,
      } as Builder;

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

      lastBuilder = builder;
      return builder;
    };

    const supabaseMock = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn((table: string) => makeBuilder(table)),
    };

    return {
      redirectMock,
      revalidatePathMock,
      supabaseMock,
      setQueryResult,
      getLastBuilder,
    };
  });

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

import {
  createRoutineAction,
  deleteRoutineAction,
  addRoutineExerciseAction,
  removeRoutineExerciseAction,
} from "@/app/(app)/rutinas/actions";

const formData = (entries: Record<string, string>): FormData => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

const expectRedirect = async (promise: Promise<unknown>, url: string) => {
  await expect(promise).rejects.toThrow(`NEXT_REDIRECT:${url}`);
};

const callOf = (method: string) => {
  const b = getLastBuilder();
  return b?.__calls.find((c) => c.method === method);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createRoutineAction", () => {
  it("requires a name", async () => {
    const result = await createRoutineAction(undefined, formData({ name: "   " }));
    expect(result).toEqual({ error: "Pon un nombre a tu rutina." });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("errors when session is missing", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await createRoutineAction(
      undefined,
      formData({ name: "Día de pierna" }),
    );
    expect(result?.error).toContain("sesión");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("inserts the routine, revalidates and redirects to its detail page", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setQueryResult({ data: { id: "rt-42" }, error: null });

    await expectRedirect(
      createRoutineAction(
        undefined,
        formData({ name: "  Día de pierna  ", description: "  cuadríceps + glúteo  " }),
      ),
      "/rutinas/rt-42",
    );

    expect(supabaseMock.from).toHaveBeenCalledWith("routines");
    expect(callOf("insert")?.args[0]).toMatchObject({
      user_id: "user-1",
      name: "Día de pierna",
      description: "cuadríceps + glúteo",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/rutinas");
  });

  it("passes null description when blank", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setQueryResult({ data: { id: "rt-1" }, error: null });

    await expectRedirect(
      createRoutineAction(undefined, formData({ name: "Empuje", description: "   " })),
      "/rutinas/rt-1",
    );

    expect(callOf("insert")?.args[0]).toMatchObject({ description: null });
  });

  it("returns error when insert fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setQueryResult({ data: null, error: { message: "boom" } });

    const result = await createRoutineAction(
      undefined,
      formData({ name: "Pierna" }),
    );
    expect(result?.error).toContain("No hemos podido crear");
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("deleteRoutineAction", () => {
  it("does nothing when id is missing", async () => {
    await deleteRoutineAction(formData({}));
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("deletes by id, revalidates and redirects to /rutinas", async () => {
    setQueryResult({ data: null, error: null });

    await expectRedirect(deleteRoutineAction(formData({ id: "rt-9" })), "/rutinas");

    expect(supabaseMock.from).toHaveBeenCalledWith("routines");
    expect(callOf("delete")).toBeDefined();
    expect(callOf("eq")?.args).toEqual(["id", "rt-9"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/rutinas");
  });
});

describe("addRoutineExerciseAction", () => {
  const base = {
    routineId: "rt-1",
    exerciseId: "ex-1",
  };

  it("requires routine and exercise ids", async () => {
    const result = await addRoutineExerciseAction(
      undefined,
      formData({ routineId: "", exerciseId: "" }),
    );
    expect(result).toEqual({ error: "Selecciona un ejercicio." });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("errors when session is missing", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await addRoutineExerciseAction(undefined, formData(base));
    expect(result?.error).toContain("sesión");
  });

  it("uses order_index = 0 when the routine has no exercises yet", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    // 1st query: max order_index -> null row. 2nd query: insert -> ok.
    setQueryResult({ data: null, error: null }, { data: null, error: null });

    const result = await addRoutineExerciseAction(
      undefined,
      formData({
        ...base,
        targetSets: "4",
        targetReps: "8",
        targetWeight: "100",
        notes: "  foco en técnica  ",
      }),
    );

    expect(result).toEqual({ success: "Ejercicio añadido." });

    const insertCall = callOf("insert")!;
    expect(insertCall.args[0]).toEqual({
      routine_id: "rt-1",
      exercise_id: "ex-1",
      user_id: "user-1",
      order_index: 0,
      target_sets: 4,
      target_reps: 8,
      target_weight_kg: 100,
      target_duration_seconds: null,
      notes: "foco en técnica",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/rutinas/rt-1");
  });

  it("computes next order_index as max + 1", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setQueryResult(
      { data: { order_index: 4 }, error: null },
      { data: null, error: null },
    );

    await addRoutineExerciseAction(
      undefined,
      formData({ ...base, targetDuration: "30" }),
    );

    expect(callOf("insert")?.args[0]).toMatchObject({ order_index: 5 });
  });

  it("coerces blank and non-positive numeric targets to null", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setQueryResult({ data: null, error: null }, { data: null, error: null });

    await addRoutineExerciseAction(
      undefined,
      formData({
        ...base,
        targetSets: "",
        targetReps: "0",
        targetWeight: "",
        targetDuration: "-5",
        notes: "",
      }),
    );

    expect(callOf("insert")?.args[0]).toMatchObject({
      target_sets: null,
      target_reps: null,
      target_weight_kg: null,
      target_duration_seconds: null,
      notes: null,
    });
  });

  it("allows target_weight_kg of 0", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setQueryResult({ data: null, error: null }, { data: null, error: null });

    await addRoutineExerciseAction(
      undefined,
      formData({ ...base, targetWeight: "0" }),
    );

    expect(callOf("insert")?.args[0]).toMatchObject({ target_weight_kg: 0 });
  });

  it("returns error when insert fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setQueryResult(
      { data: null, error: null },
      { data: null, error: { message: "constraint" } },
    );

    const result = await addRoutineExerciseAction(undefined, formData(base));
    expect(result?.error).toContain("No hemos podido añadir");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("removeRoutineExerciseAction", () => {
  it("is a no-op when id is missing", async () => {
    await removeRoutineExerciseAction(formData({ routineId: "rt-1" }));
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("deletes by id and revalidates the routine detail path", async () => {
    setQueryResult({ data: null, error: null });

    await removeRoutineExerciseAction(
      formData({ id: "re-7", routineId: "rt-3" }),
    );

    expect(supabaseMock.from).toHaveBeenCalledWith("routine_exercises");
    expect(callOf("delete")).toBeDefined();
    expect(callOf("eq")?.args).toEqual(["id", "re-7"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/rutinas/rt-3");
  });

  it("skips revalidate when routineId is absent", async () => {
    setQueryResult({ data: null, error: null });

    await removeRoutineExerciseAction(formData({ id: "re-7" }));

    expect(supabaseMock.from).toHaveBeenCalledWith("routine_exercises");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
