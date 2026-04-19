import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInWithGoogleAction = vi.fn();
vi.mock("@/app/(auth)/actions", () => ({
  signInWithGoogleAction: (...args: unknown[]) => signInWithGoogleAction(...args),
}));

import { GoogleButton } from "@/components/ui/google-button";

beforeEach(() => {
  signInWithGoogleAction.mockReset();
});

describe("GoogleButton", () => {
  it("renders default label", () => {
    render(<GoogleButton />);
    expect(
      screen.getByRole("button", { name: /continuar con google/i }),
    ).toBeInTheDocument();
  });

  it("renders custom label", () => {
    render(<GoogleButton label="Registrarse con Google" />);
    expect(
      screen.getByRole("button", { name: /registrarse con google/i }),
    ).toBeInTheDocument();
  });

  it("includes hidden redirectTo input with the provided value", () => {
    const { container } = render(<GoogleButton redirectTo="/training" />);
    const hidden = container.querySelector('input[name="redirectTo"]');
    expect(hidden).toHaveValue("/training");
  });

  it("invokes the action on submit with redirectTo", async () => {
    signInWithGoogleAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<GoogleButton redirectTo="/dashboard" />);

    await user.click(screen.getByRole("button", { name: /continuar con google/i }));

    await waitFor(() => expect(signInWithGoogleAction).toHaveBeenCalledTimes(1));
    const fd = signInWithGoogleAction.mock.calls[0][1] as FormData;
    expect(fd.get("redirectTo")).toBe("/dashboard");
  });

  it("shows error message when the action returns an error", async () => {
    signInWithGoogleAction.mockResolvedValue({
      error: "No hemos podido conectar con Google. Inténtalo de nuevo.",
    });
    const user = userEvent.setup();
    render(<GoogleButton />);

    await user.click(screen.getByRole("button", { name: /continuar con google/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no hemos podido conectar/i);
  });
});
