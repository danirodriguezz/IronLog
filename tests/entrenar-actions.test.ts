import { describe, it, expect, vi, beforeEach } from "vitest";

type QueryResult = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};

const {
  redirectMock,
  revalidatePathMock,
  supabaseMock,
  setQueryResult,
  getBuilders,
  resetBuilders,
} = vi.hoisted(() => {
  const redirectMock = vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
  const revalidatePathMock = vi.fn();

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
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "in",
    "order",
    "limit",
    "returns",
    "lt",
    "gt",
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

    builders.push(builder);
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
    getBuilders,
    resetBuilders,
  };
});

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

import {
  startSessionAction,
  saveDraftAction,
  finishSessionAction,
  discardSessionAction,
  logPastSessionAction,
  saveCompletedEditAction,
  type DraftSet,
} from "@/app/(app)/entrenar/actions";

const formData = (entries: Record<string, string>): FormData => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

const expectRedirect = async (promise: Promise<unknown>, url: string) => {
  await expect(promise).rejects.toThrow(`NEXT_REDIRECT:${url}`);
};

const buildersFor = (table: string) =>
  getBuilders().filter((b) => b.__table === table);

const callOn = (builder: ReturnType<typeof getBuilders>[number], method: string) =>
  builder.__calls.find((c) => c.method === method);

const draftSet = (overrides: Partial<DraftSet> = {}): DraftSet => ({
  sessionExerciseId: "se-1",
  setNumber: 1,
  reps: 10,
  weightKg: 80,
  durationSeconds: null,
  distanceMeters: null,
  paceSeconds: null,
  rpe: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  resetBuilders();
});

describe("startSessionAction", () => {
  it("does nothing when routineId is missing", async () => {
    await startSessionAction(formData({}));
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when user is not authenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    await expectRedirect(
      startSessionAction(formData({ routineId: "rt-1" })),
      "/login",
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("redirects to existing active session without creating a new one", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult({ data: { id: "s-existing" }, error: null });

    await expectRedirect(
      startSessionAction(formData({ routineId: "rt-1" })),
      "/entrenar/s-existing",
    );

    // Only one query (the "existing active session" lookup)
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).toHaveBeenCalledWith("sessions");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("creates session + copies routine exercises in order and redirects", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: null, error: null }, // no active session
      {
        data: {
          id: "rt-1",
          name: "Empuje",
          routine_exercises: [
            { id: "re-2", exercise_id: "ex-b", order_index: 1 },
            { id: "re-1", exercise_id: "ex-a", order_index: 0 },
          ],
        },
        error: null,
      },
      { data: { id: "s-new" }, error: null }, // insert session
      { data: null, error: null }, // insert session_exercises
    );

    await expectRedirect(
      startSessionAction(formData({ routineId: "rt-1" })),
      "/entrenar/s-new",
    );

    const sessionsBuilders = buildersFor("sessions");
    // builder 1 was the "existing" lookup, builder 2 is the insert
    const insertBuilder = sessionsBuilders[1];
    expect(callOn(insertBuilder, "insert")?.args[0]).toMatchObject({
      user_id: "u-1",
      routine_id: "rt-1",
      name: "Empuje",
      status: "active",
    });

    const seBuilder = buildersFor("session_exercises")[0];
    const inserted = callOn(seBuilder, "insert")?.args[0] as Array<{
      exercise_id: string;
      order_index: number;
    }>;
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({ exercise_id: "ex-a", order_index: 0 });
    expect(inserted[1]).toMatchObject({ exercise_id: "ex-b", order_index: 1 });

    expect(revalidatePathMock).toHaveBeenCalledWith("/entrenar");
  });

  it("still creates the session when the routine has no exercises", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: null, error: null },
      { data: { id: "rt-1", name: "Libre", routine_exercises: [] }, error: null },
      { data: { id: "s-new" }, error: null },
    );

    await expectRedirect(
      startSessionAction(formData({ routineId: "rt-1" })),
      "/entrenar/s-new",
    );

    expect(buildersFor("session_exercises")).toHaveLength(0);
    expect(revalidatePathMock).toHaveBeenCalledWith("/entrenar");
  });

  it("aborts silently when the routine doesn't exist", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: null, error: null }, // no active session
      { data: null, error: null }, // routine not found
    );

    await startSessionAction(formData({ routineId: "rt-missing" }));

    expect(buildersFor("session_exercises")).toHaveLength(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("saveDraftAction", () => {
  it("returns auth error when user is missing", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await saveDraftAction("s-1", [draftSet()]);
    expect(result?.error).toContain("expirado");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("rejects when the session belongs to another user", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult({
      data: { id: "s-1", user_id: "other-user", status: "active" },
      error: null,
    });

    const result = await saveDraftAction("s-1", [draftSet()]);
    expect(result?.error).toBe("Sesión no encontrada.");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("allows saving draft on a completed session", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "completed" }, error: null },
      { data: null, error: null }, // delete
      { data: null, error: null }, // insert
    );

    const result = await saveDraftAction("s-1", [draftSet()]);
    expect(result).toEqual({ success: "Borrador guardado." });
  });

  it("rejects when the session is discarded", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult({
      data: { id: "s-1", user_id: "u-1", status: "discarded" },
      error: null,
    });

    const result = await saveDraftAction("s-1", [draftSet()]);
    expect(result?.error).toContain("descartada");
  });

  it("replaces sets (delete + insert) filtering empty drafts", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "active" }, error: null },
      { data: null, error: null }, // delete
      { data: null, error: null }, // insert
    );

    const result = await saveDraftAction("s-1", [
      draftSet({ setNumber: 1, reps: 10, weightKg: 80 }),
      draftSet({
        setNumber: 2,
        reps: null,
        weightKg: null,
        durationSeconds: null,
        distanceMeters: null,
      }),
      draftSet({
        setNumber: 3,
        reps: null,
        weightKg: null,
        durationSeconds: 45,
      }),
    ]);

    expect(result).toEqual({ success: "Borrador guardado." });

    const setsBuilders = buildersFor("sets");
    expect(setsBuilders).toHaveLength(2);

    const deleteBuilder = setsBuilders[0];
    expect(callOn(deleteBuilder, "delete")).toBeDefined();
    expect(callOn(deleteBuilder, "eq")?.args).toEqual(["user_id", "u-1"]);
    expect(callOn(deleteBuilder, "in")?.args[0]).toBe("session_exercise_id");

    const insertBuilder = setsBuilders[1];
    const rows = callOn(insertBuilder, "insert")?.args[0] as Array<{
      set_number: number;
      reps: number | null;
      duration_seconds: number | null;
    }>;
    // Empty set #2 filtered out; #1 (reps) and #3 (duration) kept
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.set_number).sort()).toEqual([1, 3]);
    expect(rows[0]).toMatchObject({ user_id: "u-1" });

    expect(revalidatePathMock).toHaveBeenCalledWith("/entrenar/s-1");
  });

  it("skips the insert step when all drafts are empty", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "active" }, error: null },
      { data: null, error: null }, // delete
    );

    const result = await saveDraftAction("s-1", [
      draftSet({
        reps: null,
        weightKg: null,
        durationSeconds: null,
        distanceMeters: null,
      }),
    ]);

    expect(result).toEqual({ success: "Borrador guardado." });
    // only the delete builder, no insert
    expect(buildersFor("sets")).toHaveLength(1);
  });

  it("uses a sentinel UUID for the delete .in() list when sets is empty", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "active" }, error: null },
      { data: null, error: null },
    );

    await saveDraftAction("s-1", []);

    const deleteBuilder = buildersFor("sets")[0];
    const inArgs = callOn(deleteBuilder, "in")?.args[1] as string[];
    expect(inArgs).toEqual(["00000000-0000-0000-0000-000000000000"]);
  });

  it("returns an error when the delete fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "active" }, error: null },
      { data: null, error: { message: "boom" } },
    );

    const result = await saveDraftAction("s-1", [draftSet()]);
    expect(result?.error).toContain("No hemos podido guardar");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("finishSessionAction", () => {
  it("marks the session as completed after replacing sets", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "active" }, error: null },
      { data: null, error: null }, // delete
      { data: null, error: null }, // insert
      { data: null, error: null }, // update status
    );

    const result = await finishSessionAction("s-1", [draftSet()]);
    expect(result).toEqual({ success: "Entreno guardado." });

    const sessionsBuilders = buildersFor("sessions");
    // builder 1 = ownership lookup, builder 2 = update
    const updateBuilder = sessionsBuilders[1];
    const updateArgs = callOn(updateBuilder, "update")?.args[0] as {
      status: string;
      ended_at: string;
    };
    expect(updateArgs.status).toBe("completed");
    expect(typeof updateArgs.ended_at).toBe("string");

    const eqCalls = updateBuilder.__calls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["id", "s-1"] },
        { method: "eq", args: ["user_id", "u-1"] },
      ]),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/entrenar");
  });

  it("propagates replaceSets errors without completing the session", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult({
      data: { id: "s-1", user_id: "u-1", status: "discarded" },
      error: null,
    });

    const result = await finishSessionAction("s-1", [draftSet()]);
    expect(result?.error).toContain("descartada");
    expect(buildersFor("sessions")).toHaveLength(1);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("uses provided endedAt instead of current time", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "active" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    const customEndedAt = "2026-04-20T10:30:00.000Z";
    await finishSessionAction("s-1", [draftSet()], customEndedAt);

    const updateBuilder = buildersFor("sessions")[1];
    const updateArgs = callOn(updateBuilder, "update")?.args[0] as {
      status: string;
      ended_at: string;
    };
    expect(updateArgs.ended_at).toBe(customEndedAt);
    expect(updateArgs.status).toBe("completed");
  });

  it("sets ended_at to null when explicitly passed null", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "active" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    await finishSessionAction("s-1", [draftSet()], null);

    const updateBuilder = buildersFor("sessions")[1];
    const updateArgs = callOn(updateBuilder, "update")?.args[0] as {
      status: string;
      ended_at: string | null;
    };
    expect(updateArgs.ended_at).toBeNull();
  });

  it("returns an error when the status update fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "active" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: { message: "db down" } },
    );

    const result = await finishSessionAction("s-1", [draftSet()]);
    expect(result?.error).toContain("cerrar el entreno");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("discardSessionAction", () => {
  it("does nothing when sessionId is missing", async () => {
    await discardSessionAction(formData({}));
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when user is not authenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    await expectRedirect(
      discardSessionAction(formData({ sessionId: "s-1" })),
      "/login",
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("deletes the session guarded by user_id and active status, then redirects", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult({ data: null, error: null });

    await expectRedirect(
      discardSessionAction(formData({ sessionId: "s-1" })),
      "/entrenar",
    );

    const b = buildersFor("sessions")[0];
    expect(callOn(b, "delete")).toBeDefined();
    expect(callOn(b, "update")).toBeUndefined();

    const eqCalls = b.__calls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["id", "s-1"] },
        { method: "eq", args: ["user_id", "u-1"] },
        { method: "eq", args: ["status", "active"] },
      ]),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/entrenar");
  });
});

describe("logPastSessionAction", () => {
  it("does nothing when routineId is missing", async () => {
    await logPastSessionAction(formData({ sessionDate: "2026-04-20" }));
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("does nothing when sessionDate is missing", async () => {
    await logPastSessionAction(formData({ routineId: "rt-1" }));
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("does nothing when sessionDate has invalid format", async () => {
    await logPastSessionAction(formData({ routineId: "rt-1", sessionDate: "20-04-2026" }));
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("redirects to /login when user is not authenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    await expectRedirect(
      logPastSessionAction(formData({ routineId: "rt-1", sessionDate: "2026-04-20" })),
      "/login",
    );
  });

  it("redirects to existing active session without creating a new one", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult({ data: { id: "s-existing" }, error: null });

    await expectRedirect(
      logPastSessionAction(formData({ routineId: "rt-1", sessionDate: "2026-04-20" })),
      "/entrenar/s-existing",
    );
    expect(buildersFor("routines")).toHaveLength(0);
  });

  it("creates session with started_at set to noon UTC of the given date", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: null, error: null },
      {
        data: {
          id: "rt-1",
          name: "Empuje",
          routine_exercises: [{ id: "re-1", exercise_id: "ex-a", order_index: 0 }],
        },
        error: null,
      },
      { data: { id: "s-new" }, error: null },
      { data: null, error: null },
    );

    await expectRedirect(
      logPastSessionAction(formData({ routineId: "rt-1", sessionDate: "2026-04-20" })),
      "/entrenar/s-new",
    );

    const insertBuilder = buildersFor("sessions")[1];
    const insertArgs = callOn(insertBuilder, "insert")?.args[0] as {
      started_at: string;
      status: string;
    };
    expect(insertArgs.started_at).toBe("2026-04-20T12:00:00.000Z");
    expect(insertArgs.status).toBe("active");
    expect(revalidatePathMock).toHaveBeenCalledWith("/entrenar");
  });

  it("copies routine exercises sorted by order_index", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: null, error: null },
      {
        data: {
          id: "rt-1",
          name: "Empuje",
          routine_exercises: [
            { id: "re-2", exercise_id: "ex-b", order_index: 1 },
            { id: "re-1", exercise_id: "ex-a", order_index: 0 },
          ],
        },
        error: null,
      },
      { data: { id: "s-new" }, error: null },
      { data: null, error: null },
    );

    await expectRedirect(
      logPastSessionAction(formData({ routineId: "rt-1", sessionDate: "2026-04-20" })),
      "/entrenar/s-new",
    );

    const seBuilder = buildersFor("session_exercises")[0];
    const inserted = callOn(seBuilder, "insert")?.args[0] as Array<{
      exercise_id: string;
      order_index: number;
    }>;
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({ exercise_id: "ex-a", order_index: 0 });
    expect(inserted[1]).toMatchObject({ exercise_id: "ex-b", order_index: 1 });
  });

  it("aborts silently when the routine does not exist", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: null, error: null },
      { data: null, error: null },
    );

    await logPastSessionAction(formData({ routineId: "rt-missing", sessionDate: "2026-04-20" }));
    expect(buildersFor("session_exercises")).toHaveLength(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("saveCompletedEditAction", () => {
  it("returns auth error when user is missing", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await saveCompletedEditAction("s-1", [draftSet()]);
    expect(result?.error).toContain("expirado");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("rejects when session belongs to another user", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult({
      data: { id: "s-1", user_id: "other-user", status: "completed" },
      error: null,
    });

    const result = await saveCompletedEditAction("s-1", [draftSet()]);
    expect(result?.error).toBe("Sesión no encontrada.");
  });

  it("rejects when session is discarded", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult({
      data: { id: "s-1", user_id: "u-1", status: "discarded" },
      error: null,
    });

    const result = await saveCompletedEditAction("s-1", [draftSet()]);
    expect(result?.error).toContain("descartada");
  });

  it("saves sets on a completed session and returns success", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "completed" }, error: null },
      { data: null, error: null }, // delete
      { data: null, error: null }, // insert
    );

    const result = await saveCompletedEditAction("s-1", [draftSet()]);
    expect(result).toEqual({ success: "Cambios guardados." });
    expect(buildersFor("sets")).toHaveLength(2);
  });

  it("updates ended_at when endedAt is provided", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "completed" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null }, // update ended_at
    );

    const customEndedAt = "2026-04-20T13:00:00.000Z";
    await saveCompletedEditAction("s-1", [draftSet()], customEndedAt);

    const updateBuilder = buildersFor("sessions")[1];
    const updateArgs = callOn(updateBuilder, "update")?.args[0] as { ended_at: string };
    expect(updateArgs.ended_at).toBe(customEndedAt);
  });

  it("skips the ended_at update when endedAt is undefined", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "completed" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    await saveCompletedEditAction("s-1", [draftSet()], undefined);

    // Only one sessions builder (the ownership lookup), no update
    expect(buildersFor("sessions")).toHaveLength(1);
  });

  it("revalidates both the session detail path and /entrenar", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    setQueryResult(
      { data: { id: "s-1", user_id: "u-1", status: "completed" }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    await saveCompletedEditAction("s-1", [draftSet()]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/entrenar/historial/s-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/entrenar");
  });
});
