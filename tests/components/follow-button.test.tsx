import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { followUserActionMock, unfollowUserActionMock } = vi.hoisted(() => ({
  followUserActionMock: vi.fn(),
  unfollowUserActionMock: vi.fn(),
}));

vi.mock("@/app/(app)/u/[username]/actions", () => ({
  followUserAction: followUserActionMock,
  unfollowUserAction: unfollowUserActionMock,
}));

import { FollowButton } from "@/app/(app)/u/[username]/_components/follow-button";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FollowButton — status=none, public profile", () => {
  it("renders 'Seguir' label", () => {
    render(
      <FollowButton targetId="t1" targetUsername="alice" isPublicProfile initialStatus="none" />,
    );
    expect(screen.getByRole("button", { name: /seguir/i })).toBeInTheDocument();
  });

  it("transitions to 'Siguiendo' after a successful follow on a public profile", async () => {
    followUserActionMock.mockResolvedValue({ status: "accepted" });
    render(
      <FollowButton targetId="t1" targetUsername="alice" isPublicProfile initialStatus="none" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /seguir/i }));
    await waitFor(() => expect(screen.getByText("Siguiendo")).toBeInTheDocument());
  });

  it("transitions to 'Solicitud enviada' after a successful follow on a private profile", async () => {
    followUserActionMock.mockResolvedValue({ status: "pending" });
    render(
      <FollowButton
        targetId="t1"
        targetUsername="bob"
        isPublicProfile={false}
        initialStatus="none"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /solicitar seguir/i }));
    await waitFor(() => expect(screen.getByText("Solicitud enviada")).toBeInTheDocument());
  });

  it("shows error inline when followUserAction returns an error", async () => {
    followUserActionMock.mockResolvedValue({ error: "No se pudo completar la acción." });
    render(
      <FollowButton targetId="t1" targetUsername="alice" isPublicProfile initialStatus="none" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /seguir/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo completar la acción."),
    );
  });
});

describe("FollowButton — status=none, private profile", () => {
  it("renders 'Solicitar seguir' label", () => {
    render(
      <FollowButton
        targetId="t1"
        targetUsername="bob"
        isPublicProfile={false}
        initialStatus="none"
      />,
    );
    expect(screen.getByRole("button", { name: /solicitar seguir/i })).toBeInTheDocument();
  });
});

describe("FollowButton — status=pending", () => {
  it("renders 'Solicitud enviada' by default", () => {
    render(
      <FollowButton
        targetId="t1"
        targetUsername="bob"
        isPublicProfile={false}
        initialStatus="pending"
      />,
    );
    expect(screen.getByText("Solicitud enviada")).toBeInTheDocument();
  });

  it("shows 'Cancelar solicitud' on hover", () => {
    render(
      <FollowButton
        targetId="t1"
        targetUsername="bob"
        isPublicProfile={false}
        initialStatus="pending"
      />,
    );
    const btn = screen.getByText("Solicitud enviada");
    fireEvent.mouseEnter(btn);
    expect(screen.getByText("Cancelar solicitud")).toBeInTheDocument();
  });

  it("reverts to 'none' after unfollowing", async () => {
    unfollowUserActionMock.mockResolvedValue({});
    render(
      <FollowButton
        targetId="t1"
        targetUsername="bob"
        isPublicProfile={false}
        initialStatus="pending"
      />,
    );
    fireEvent.click(screen.getByText("Solicitud enviada"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /solicitar seguir/i })).toBeInTheDocument(),
    );
  });

  it("shows error when unfollowUserAction returns an error", async () => {
    unfollowUserActionMock.mockResolvedValue({ error: "No se pudo completar la acción." });
    render(
      <FollowButton
        targetId="t1"
        targetUsername="bob"
        isPublicProfile={false}
        initialStatus="pending"
      />,
    );
    fireEvent.click(screen.getByText("Solicitud enviada"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo completar la acción."),
    );
  });
});

describe("FollowButton — status=accepted", () => {
  it("renders 'Siguiendo' by default", () => {
    render(
      <FollowButton targetId="t1" targetUsername="alice" isPublicProfile initialStatus="accepted" />,
    );
    expect(screen.getByText("Siguiendo")).toBeInTheDocument();
  });

  it("shows 'Dejar de seguir' on hover", () => {
    render(
      <FollowButton targetId="t1" targetUsername="alice" isPublicProfile initialStatus="accepted" />,
    );
    fireEvent.mouseEnter(screen.getByText("Siguiendo"));
    expect(screen.getByText("Dejar de seguir")).toBeInTheDocument();
  });

  it("reverts to status=none after unfollowing", async () => {
    unfollowUserActionMock.mockResolvedValue({});
    render(
      <FollowButton targetId="t1" targetUsername="alice" isPublicProfile initialStatus="accepted" />,
    );
    fireEvent.click(screen.getByText("Siguiendo"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /seguir/i })).toBeInTheDocument(),
    );
  });
});
