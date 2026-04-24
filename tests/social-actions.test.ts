import { describe, it, expect, vi, beforeEach } from "vitest";

const { supabaseMock } = vi.hoisted(() => {
  const supabaseMock = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  };

  return { supabaseMock };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

import { searchUsers } from "@/app/(app)/_actions/users";
import { followUserAction, unfollowUserAction } from "@/app/(app)/u/[username]/actions";
import {
  acceptRequestAction,
  rejectRequestAction,
} from "@/app/(app)/profile/solicitudes/actions";

const authedUser = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── searchUsers ───────────────────────────────────────────────────────────

describe("searchUsers", () => {
  it("returns [] without calling RPC when query length < 2", async () => {
    const result = await searchUsers("a");
    expect(result).toEqual([]);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("returns [] on empty query", async () => {
    const result = await searchUsers("");
    expect(result).toEqual([]);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("returns [] when RPC errors", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = await searchUsers("al");
    expect(result).toEqual([]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("search_users", { q: "al" });
  });

  it("returns array from RPC on success", async () => {
    const users = [
      { id: "u1", username: "alice", full_name: "Alice", avatar_url: null, is_public: true },
    ];
    supabaseMock.rpc.mockResolvedValue({ data: users, error: null });
    const result = await searchUsers("al");
    expect(result).toEqual(users);
  });

  it("trims query before length check", async () => {
    const result = await searchUsers("  a  ");
    expect(result).toEqual([]);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});

// ─── followUserAction ──────────────────────────────────────────────────────

describe("followUserAction", () => {
  it("returns error when not authenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await followUserAction("target-1", "target");
    expect(res).toEqual({ error: "No autenticado." });
  });

  it("returns error when following yourself", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const res = await followUserAction("user-1", "me");
    expect(res).toEqual({ error: "No puedes seguirte a ti mismo." });
  });

  it("returns error on Supabase insert error", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    supabaseMock.from.mockReturnValue(chain);

    const res = await followUserAction("target-2", "target");
    expect(res).toEqual({ error: "No se pudo completar la acción." });
  });

  it("returns status 'accepted' on public follow", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { status: "accepted" }, error: null }),
    };
    supabaseMock.from.mockReturnValue(chain);

    const res = await followUserAction("target-2", "target");
    expect(res).toEqual({ status: "accepted" });
  });

  it("returns status 'pending' on private follow", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { status: "pending" }, error: null }),
    };
    supabaseMock.from.mockReturnValue(chain);

    const res = await followUserAction("target-3", "private-user");
    expect(res).toEqual({ status: "pending" });
  });
});

// ─── unfollowUserAction ────────────────────────────────────────────────────

describe("unfollowUserAction", () => {
  it("returns error when not authenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await unfollowUserAction("target-1", "target");
    expect(res).toEqual({ error: "No autenticado." });
  });

  it("returns error on Supabase delete error", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // last .eq() call resolves
    };
    chain.eq.mockReturnValueOnce(chain).mockResolvedValue({ error: { message: "fail" } });
    supabaseMock.from.mockReturnValue(chain);

    const res = await unfollowUserAction("target-2", "target");
    expect(res).toEqual({ error: "No se pudo completar la acción." });
  });

  it("returns {} on success", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue(chain);

    const res = await unfollowUserAction("target-2", "target");
    expect(res).toEqual({});
  });
});

// ─── acceptRequestAction ───────────────────────────────────────────────────

describe("acceptRequestAction", () => {
  it("returns error when not authenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await acceptRequestAction("follower-1");
    expect(res).toEqual({ error: "No autenticado." });
  });

  it("returns error on Supabase update error", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValue({
      error: { message: "fail" },
    });
    supabaseMock.from.mockReturnValue(chain);

    const res = await acceptRequestAction("follower-1");
    expect(res).toEqual({ error: "No se pudo aceptar la solicitud." });
  });

  it("returns {} on success and calls update with correct filters", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValue({
      error: null,
    });
    supabaseMock.from.mockReturnValue(chain);

    const res = await acceptRequestAction("follower-1");
    expect(res).toEqual({});
    expect(chain.update).toHaveBeenCalledWith({ status: "accepted" });
    expect(chain.eq).toHaveBeenCalledWith("follower_id", "follower-1");
    expect(chain.eq).toHaveBeenCalledWith("following_id", authedUser.id);
    expect(chain.eq).toHaveBeenCalledWith("status", "pending");
  });
});

// ─── rejectRequestAction ───────────────────────────────────────────────────

describe("rejectRequestAction", () => {
  it("returns error when not authenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await rejectRequestAction("follower-1");
    expect(res).toEqual({ error: "No autenticado." });
  });

  it("returns error on Supabase delete error", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValue({
      error: { message: "fail" },
    });
    supabaseMock.from.mockReturnValue(chain);

    const res = await rejectRequestAction("follower-1");
    expect(res).toEqual({ error: "No se pudo rechazar la solicitud." });
  });

  it("returns {} on success and uses correct filters", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: authedUser } });
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValue({
      error: null,
    });
    supabaseMock.from.mockReturnValue(chain);

    const res = await rejectRequestAction("follower-1");
    expect(res).toEqual({});
    expect(chain.eq).toHaveBeenCalledWith("follower_id", "follower-1");
    expect(chain.eq).toHaveBeenCalledWith("following_id", authedUser.id);
    expect(chain.eq).toHaveBeenCalledWith("status", "pending");
  });
});
