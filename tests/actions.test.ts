import { describe, it, expect, vi, beforeEach } from "vitest";

const { redirectMock, supabaseMock } = vi.hoisted(() => {
  const redirectMock = vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
  const supabaseMock = {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  };
  return { redirectMock, supabaseMock };
});

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

import {
  signInAction,
  signUpAction,
  signOutAction,
  requestPasswordResetAction,
  updatePasswordAction,
} from "@/app/(auth)/actions";

const formData = (entries: Record<string, string>): FormData => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

const expectRedirect = async (promise: Promise<unknown>, url: string) => {
  await expect(promise).rejects.toThrow(`NEXT_REDIRECT:${url}`);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signInAction", () => {
  it("returns error when email or password missing", async () => {
    const result = await signInAction(undefined, formData({ email: "", password: "" }));
    expect(result).toEqual({ error: "Introduce tu email y contraseña." });
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns generic error on bad credentials", async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const result = await signInAction(
      undefined,
      formData({ email: "a@b.com", password: "secret123" }),
    );
    expect(result).toEqual({ error: "Credenciales incorrectas. Prueba de nuevo." });
  });

  it("redirects to redirectTo on success", async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    await expectRedirect(
      signInAction(
        undefined,
        formData({ email: "a@b.com", password: "secret123", redirectTo: "/training" }),
      ),
      "/training",
    );
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret123",
    });
  });

  it("defaults redirect to /dashboard", async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    await expectRedirect(
      signInAction(undefined, formData({ email: "a@b.com", password: "secret123" })),
      "/dashboard",
    );
  });

  it("trims the email before submitting", async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    await expectRedirect(
      signInAction(
        undefined,
        formData({ email: "  a@b.com  ", password: "secret123" }),
      ),
      "/dashboard",
    );
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret123",
    });
  });
});

describe("signUpAction", () => {
  it("rejects missing fields", async () => {
    const result = await signUpAction(undefined, formData({ email: "", password: "" }));
    expect(result).toEqual({ error: "Introduce tu email y una contraseña." });
  });

  it("rejects short password", async () => {
    const result = await signUpAction(
      undefined,
      formData({ email: "a@b.com", password: "short" }),
    );
    expect(result).toEqual({
      error: "La contraseña debe tener al menos 8 caracteres.",
    });
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it("forwards supabase error message", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      error: { message: "User already registered" },
    });
    const result = await signUpAction(
      undefined,
      formData({ email: "a@b.com", password: "secret123" }),
    );
    expect(result).toEqual({ error: "User already registered" });
  });

  it("returns success message and calls signUp with emailRedirectTo", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ error: null });
    const result = await signUpAction(
      undefined,
      formData({ email: "a@b.com", password: "secret123", name: "Daniel" }),
    );
    expect(result?.success).toContain("confirmación");
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret123",
      options: {
        data: { full_name: "Daniel" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });
  });

  it("passes full_name as null when no name provided", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ error: null });
    await signUpAction(
      undefined,
      formData({ email: "a@b.com", password: "secret123" }),
    );
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ data: { full_name: null } }),
      }),
    );
  });
});

describe("signOutAction", () => {
  it("signs out and redirects to /login", async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
    await expectRedirect(signOutAction(), "/login");
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
  });
});

describe("requestPasswordResetAction", () => {
  it("rejects empty email", async () => {
    const result = await requestPasswordResetAction(undefined, formData({ email: "" }));
    expect(result).toEqual({ error: "Introduce el email de tu cuenta." });
    expect(supabaseMock.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("calls Supabase with encoded redirect to /update-password", async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await requestPasswordResetAction(
      undefined,
      formData({ email: "a@b.com" }),
    );
    expect(result?.success).toContain("restablecer");
    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.com", {
      redirectTo: "http://localhost:3000/auth/callback?next=%2Fupdate-password",
    });
  });

  it("returns generic error on failure (no user enumeration leak)", async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: "rate limit" },
    });
    const result = await requestPasswordResetAction(
      undefined,
      formData({ email: "a@b.com" }),
    );
    expect(result).toEqual({
      error: "No hemos podido enviar el email. Inténtalo de nuevo.",
    });
  });
});

describe("updatePasswordAction", () => {
  it("rejects short password", async () => {
    const result = await updatePasswordAction(
      undefined,
      formData({ password: "short", confirm: "short" }),
    );
    expect(result).toEqual({
      error: "La contraseña debe tener al menos 8 caracteres.",
    });
  });

  it("rejects mismatched confirmation", async () => {
    const result = await updatePasswordAction(
      undefined,
      formData({ password: "secret123", confirm: "secret999" }),
    );
    expect(result).toEqual({ error: "Las contraseñas no coinciden." });
  });

  it("rejects when there is no recovery session", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await updatePasswordAction(
      undefined,
      formData({ password: "secret123", confirm: "secret123" }),
    );
    expect(result).toEqual({ error: "El enlace ha expirado. Solicita uno nuevo." });
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it("returns error when updateUser fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: { message: "weak" } });
    const result = await updatePasswordAction(
      undefined,
      formData({ password: "secret123", confirm: "secret123" }),
    );
    expect(result?.error).toBeDefined();
  });

  it("redirects to /dashboard on success", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });
    await expectRedirect(
      updatePasswordAction(
        undefined,
        formData({ password: "secret123", confirm: "secret123" }),
      ),
      "/dashboard",
    );
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: "secret123" });
  });
});
