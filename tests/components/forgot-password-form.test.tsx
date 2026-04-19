import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const requestPasswordResetAction = vi.fn();
vi.mock("@/app/(auth)/actions", () => ({
  requestPasswordResetAction: (...args: unknown[]) => requestPasswordResetAction(...args),
}));

import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";

beforeEach(() => {
  requestPasswordResetAction.mockReset();
});

describe("ForgotPasswordForm", () => {
  it("submits the email", async () => {
    requestPasswordResetAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    await waitFor(() => expect(requestPasswordResetAction).toHaveBeenCalledTimes(1));
    const fd = requestPasswordResetAction.mock.calls[0][1] as FormData;
    expect(fd.get("email")).toBe("a@b.com");
  });

  it("shows success confirmation and hides form", async () => {
    requestPasswordResetAction.mockResolvedValue({
      success: "Si ese email está registrado, te enviaremos un enlace",
    });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /enlace enviado/i })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /enviar enlace/i })).not.toBeInTheDocument();
  });

  it("shows error alert", async () => {
    requestPasswordResetAction.mockResolvedValue({
      error: "No hemos podido enviar el email. Inténtalo de nuevo.",
    });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no hemos podido enviar/i);
  });
});
