import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const updatePasswordAction = vi.fn();
vi.mock("@/app/(auth)/actions", () => ({
  updatePasswordAction: (...args: unknown[]) => updatePasswordAction(...args),
}));

import { UpdatePasswordForm } from "@/app/(auth)/update-password/update-password-form";

beforeEach(() => {
  updatePasswordAction.mockReset();
});

describe("UpdatePasswordForm", () => {
  it("renders password and confirm fields", () => {
    render(<UpdatePasswordForm />);
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeInTheDocument();
  });

  it("submits both fields", async () => {
    updatePasswordAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<UpdatePasswordForm />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "secret123");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "secret123");
    await user.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    await waitFor(() => expect(updatePasswordAction).toHaveBeenCalledTimes(1));
    const fd = updatePasswordAction.mock.calls[0][1] as FormData;
    expect(fd.get("password")).toBe("secret123");
    expect(fd.get("confirm")).toBe("secret123");
  });

  it("renders error alert when passwords don't match", async () => {
    updatePasswordAction.mockResolvedValue({ error: "Las contraseñas no coinciden." });
    const user = userEvent.setup();
    render(<UpdatePasswordForm />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "secret123");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "secret999");
    await user.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no coinciden/i);
  });
});
