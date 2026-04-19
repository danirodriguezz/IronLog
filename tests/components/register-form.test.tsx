import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signUpAction = vi.fn();
vi.mock("@/app/(auth)/actions", () => ({
  signUpAction: (...args: unknown[]) => signUpAction(...args),
}));

import { RegisterForm } from "@/app/(auth)/register/register-form";

beforeEach(() => {
  signUpAction.mockReset();
});

describe("RegisterForm", () => {
  it("renders name, email and password fields", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
  });

  it("submits name, email and password", async () => {
    signUpAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Nombre"), "Daniel");
    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Contraseña"), "secret123");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => expect(signUpAction).toHaveBeenCalledTimes(1));
    const fd = signUpAction.mock.calls[0][1] as FormData;
    expect(fd.get("name")).toBe("Daniel");
    expect(fd.get("email")).toBe("a@b.com");
    expect(fd.get("password")).toBe("secret123");
  });

  it("shows success state and hides form when action returns success", async () => {
    signUpAction.mockResolvedValue({ success: "Revisa tu email" });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Contraseña"), "secret123");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /revisa tu email/i })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /crear cuenta/i })).not.toBeInTheDocument();
  });

  it("renders error state", async () => {
    signUpAction.mockResolvedValue({ error: "User already registered" });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Contraseña"), "secret123");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("User already registered");
  });
});
