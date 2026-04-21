import { describe, it, expect, vi, beforeEach } from "vitest";

const { supabaseMock, revalidateMock, redirectMock, updateBuilder, clearBuilder } = vi.hoisted(
  () => {
    const revalidateMock = vi.fn();
    const redirectMock = vi.fn();

    const clearBuilder = {
      update: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
    };
    const updateBuilder = {
      update: vi.fn(),
      eq: vi.fn(),
    };

    const supabaseMock = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    };

    return { supabaseMock, revalidateMock, redirectMock, updateBuilder, clearBuilder };
  },
);

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

import { assignRoutineToDayAction } from "@/app/(app)/rutinas/actions";

const formData = (entries: Record<string, string>): FormData => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();

  clearBuilder.update.mockReturnValue(clearBuilder);
  clearBuilder.eq.mockReturnValue(clearBuilder);
  clearBuilder.neq.mockResolvedValue({ error: null });

  updateBuilder.update.mockReturnValue(updateBuilder);
  updateBuilder.eq.mockResolvedValue({ error: null });

  let call = 0;
  supabaseMock.from.mockImplementation(() => {
    call += 1;
    return call === 1 && supabaseMock.from.mock.calls.length <= 2 ? clearBuilder : updateBuilder;
  });
  supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("assignRoutineToDayAction", () => {
  it("returns error when routineId missing", async () => {
    const result = await assignRoutineToDayAction(formData({ day: "1" }));
    expect(result).toEqual({ error: "Rutina no válida." });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("rejects invalid day values", async () => {
    const result = await assignRoutineToDayAction(formData({ routineId: "r1", day: "9" }));
    expect(result).toEqual({ error: "Día no válido." });
  });

  it("rejects non-integer day", async () => {
    const result = await assignRoutineToDayAction(formData({ routineId: "r1", day: "abc" }));
    expect(result).toEqual({ error: "Día no válido." });
  });

  it("returns error when session expired", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await assignRoutineToDayAction(formData({ routineId: "r1", day: "1" }));
    expect(result).toEqual({ error: "Tu sesión ha expirado." });
  });

  it("unassigns when day is empty (sends routine back to baúl)", async () => {
    supabaseMock.from.mockReset();
    supabaseMock.from.mockReturnValue(updateBuilder);

    const result = await assignRoutineToDayAction(formData({ routineId: "r1", day: "" }));

    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(updateBuilder.update).toHaveBeenCalledWith({ day_of_week: null });
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "r1");
    expect(revalidateMock).toHaveBeenCalledWith("/rutinas");
    expect(result).toEqual({ success: "Rutina actualizada." });
  });

  it("frees the target day before assigning (replace semantics)", async () => {
    supabaseMock.from.mockReset();
    supabaseMock.from
      .mockReturnValueOnce(clearBuilder)
      .mockReturnValueOnce(updateBuilder);

    const result = await assignRoutineToDayAction(formData({ routineId: "r1", day: "3" }));

    expect(clearBuilder.update).toHaveBeenCalledWith({ day_of_week: null });
    expect(clearBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(clearBuilder.eq).toHaveBeenCalledWith("day_of_week", 3);
    expect(clearBuilder.neq).toHaveBeenCalledWith("id", "r1");

    expect(updateBuilder.update).toHaveBeenCalledWith({ day_of_week: 3 });
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "r1");

    expect(revalidateMock).toHaveBeenCalledWith("/rutinas");
    expect(result).toEqual({ success: "Rutina actualizada." });
  });

  it("returns error when the assign update fails", async () => {
    supabaseMock.from.mockReset();
    supabaseMock.from
      .mockReturnValueOnce(clearBuilder)
      .mockReturnValueOnce(updateBuilder);
    updateBuilder.eq.mockResolvedValue({ error: { message: "boom" } });

    const result = await assignRoutineToDayAction(formData({ routineId: "r1", day: "2" }));

    expect(result).toEqual({ error: "No hemos podido mover la rutina." });
    expect(revalidateMock).not.toHaveBeenCalled();
  });
});
