import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInWithOAuthMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
    },
  }),
}));

import { GoogleButton } from "@/components/ui/google-button";

beforeEach(() => {
  signInWithOAuthMock.mockReset();
  // jsdom no implementa navegación, así que la espiamos
  vi.spyOn(window, "location", "get").mockReturnValue({
    ...window.location,
    origin: "http://localhost:3000",
  } as Location);
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, href: "", origin: "http://localhost:3000" },
  });
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

  it("calls signInWithOAuth with correct params on click", async () => {
    signInWithOAuthMock.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth?test=1" },
      error: null,
    });
    const user = userEvent.setup();
    render(<GoogleButton redirectTo="/dashboard" />);

    await user.click(screen.getByRole("button", { name: /continuar con google/i }));

    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalledTimes(1));
    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback?next=%2Fdashboard",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  });

  it("redirects to the OAuth url returned by Supabase", async () => {
    const oauthUrl = "https://accounts.google.com/o/oauth2/auth?test=1";
    signInWithOAuthMock.mockResolvedValue({
      data: { url: oauthUrl },
      error: null,
    });
    const user = userEvent.setup();
    render(<GoogleButton />);

    await user.click(screen.getByRole("button", { name: /continuar con google/i }));

    await waitFor(() => expect(window.location.href).toBe(oauthUrl));
  });

  it("shows error message when Supabase returns no url", async () => {
    signInWithOAuthMock.mockResolvedValue({ data: { url: null }, error: null });
    const user = userEvent.setup();
    render(<GoogleButton />);

    await user.click(screen.getByRole("button", { name: /continuar con google/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no hemos podido conectar/i);
  });

  it("shows error message when Supabase errors", async () => {
    signInWithOAuthMock.mockResolvedValue({
      data: { url: null },
      error: { message: "boom" },
    });
    const user = userEvent.setup();
    render(<GoogleButton />);

    await user.click(screen.getByRole("button", { name: /continuar con google/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no hemos podido conectar/i);
  });

  it("disables the button while pending", async () => {
    let resolve: (v: unknown) => void;
    signInWithOAuthMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<GoogleButton />);

    const btn = screen.getByRole("button", { name: /continuar con google/i });
    await user.click(btn);

    expect(btn).toBeDisabled();

    resolve!({ data: { url: null }, error: { message: "x" } });
  });
});
