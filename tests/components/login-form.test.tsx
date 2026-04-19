import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInAction = vi.fn();
vi.mock("@/app/(auth)/actions", () => ({
  signInAction: (...args: unknown[]) => signInAction(...args),
}));

import { LoginForm } from "@/app/(auth)/login/login-form";

beforeEach(() => {
  signInAction.mockReset();
});

describe("LoginForm", () => {
  it("renders email, password, remember and forgot-password link", () => {
    render(<LoginForm redirectTo="/dashboard" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText(/mantener sesión/i)).toBeChecked();
    expect(screen.getByRole("link", { name: /olvidaste tu contraseña/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("includes hidden redirectTo input", () => {
    const { container } = render(<LoginForm redirectTo="/training" />);
    const hidden = container.querySelector('input[name="redirectTo"]');
    expect(hidden).toHaveValue("/training");
  });

  it("submits the form and calls signInAction with form data", async () => {
    signInAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/dashboard" />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Contraseña"), "secret123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(signInAction).toHaveBeenCalledTimes(1));
    const fd = signInAction.mock.calls[0][1] as FormData;
    expect(fd.get("email")).toBe("a@b.com");
    expect(fd.get("password")).toBe("secret123");
    expect(fd.get("redirectTo")).toBe("/dashboard");
  });

  it("renders error state returned by the action", async () => {
    signInAction.mockResolvedValue({ error: "Credenciales incorrectas. Prueba de nuevo." });
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/dashboard" />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Contraseña"), "wrong");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Credenciales incorrectas");
  });
});
