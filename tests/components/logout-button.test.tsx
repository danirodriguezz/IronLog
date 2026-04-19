import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signOutAction = vi.fn();
vi.mock("@/app/(auth)/actions", () => ({
  signOutAction: (...args: unknown[]) => signOutAction(...args),
}));

import { LogoutButton } from "@/components/ui/logout-button";

beforeEach(() => {
  signOutAction.mockReset();
});

describe("LogoutButton", () => {
  it("renders a submit button with accessible label", () => {
    render(<LogoutButton />);
    const button = screen.getByRole("button", { name: /cerrar sesión/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "submit");
  });

  it("invokes signOutAction when clicked", async () => {
    signOutAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(signOutAction).toHaveBeenCalledTimes(1);
    });
  });

  it("shows pending state while the action is in flight", async () => {
    let resolveAction: (() => void) | undefined;
    signOutAction.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveAction = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeDisabled();
    });
    expect(screen.getByText(/saliendo/i)).toBeInTheDocument();

    await act(async () => {
      resolveAction?.();
    });
  });
});
