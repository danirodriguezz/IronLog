// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

import { updateSession } from "@/lib/supabase/middleware";

const makeRequest = (pathname: string): NextRequest => {
  return new NextRequest(new URL(pathname, "http://localhost:3000"), {
    headers: new Headers(),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateSession — unauthenticated", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: null } });
  });

  it("allows the landing page", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.headers.get("location")).toBeNull();
  });

  it.each(["/login", "/register", "/forgot-password"])(
    "allows public auth page %s",
    async (path) => {
      const res = await updateSession(makeRequest(path));
      expect(res.headers.get("location")).toBeNull();
    },
  );

  it("allows /auth/callback (prefix match)", async () => {
    const res = await updateSession(makeRequest("/auth/callback?code=abc"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects /dashboard to /login with redirectTo preserved", async () => {
    const res = await updateSession(makeRequest("/dashboard"));
    const loc = res.headers.get("location");
    expect(loc).toBeTruthy();
    const url = new URL(loc!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirectTo")).toBe("/dashboard");
  });

  it("redirects deep protected paths to /login with that path as redirectTo", async () => {
    const res = await updateSession(makeRequest("/training/session/42"));
    const url = new URL(res.headers.get("location")!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirectTo")).toBe("/training/session/42");
  });
});

describe("updateSession — authenticated", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  });

  it.each(["/login", "/register", "/forgot-password"])(
    "bounces %s to /dashboard",
    async (path) => {
      const res = await updateSession(makeRequest(path));
      const url = new URL(res.headers.get("location")!);
      expect(url.pathname).toBe("/dashboard");
      expect(url.searchParams.get("redirectTo")).toBeNull();
    },
  );

  it("does not bounce /update-password (recovery session must reach the form)", async () => {
    const res = await updateSession(makeRequest("/update-password"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows /dashboard", async () => {
    const res = await updateSession(makeRequest("/dashboard"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows landing page without redirect", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.headers.get("location")).toBeNull();
  });
});
