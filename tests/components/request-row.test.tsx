import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { acceptRequestActionMock, rejectRequestActionMock } = vi.hoisted(() => ({
  acceptRequestActionMock: vi.fn(),
  rejectRequestActionMock: vi.fn(),
}));

vi.mock("@/app/(app)/profile/solicitudes/actions", () => ({
  acceptRequestAction: acceptRequestActionMock,
  rejectRequestAction: rejectRequestActionMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { RequestRow } from "@/app/(app)/profile/solicitudes/_components/request-row";

const defaultProps = {
  followerId: "follower-1",
  username: "alice",
  fullName: "Alice Smith",
  avatarUrl: null,
  isPublic: true,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RequestRow", () => {
  it("renders username, full name and action buttons", () => {
    render(<RequestRow {...defaultProps} />);
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aceptar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rechazar/i })).toBeInTheDocument();
  });

  it("collapses to 'Aceptada' state after accepting", async () => {
    acceptRequestActionMock.mockResolvedValue({});
    render(<RequestRow {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /aceptar/i }));
    await waitFor(() => expect(screen.getByText("Aceptada")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /aceptar/i })).not.toBeInTheDocument();
  });

  it("collapses to 'Rechazada' state after rejecting", async () => {
    rejectRequestActionMock.mockResolvedValue({});
    render(<RequestRow {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /rechazar/i }));
    await waitFor(() => expect(screen.getByText("Rechazada")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /rechazar/i })).not.toBeInTheDocument();
  });

  it("shows error inline when acceptRequestAction returns an error", async () => {
    acceptRequestActionMock.mockResolvedValue({ error: "No se pudo aceptar la solicitud." });
    render(<RequestRow {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /aceptar/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo aceptar la solicitud."),
    );
    expect(screen.getByRole("button", { name: /aceptar/i })).toBeInTheDocument();
  });

  it("shows error inline when rejectRequestAction returns an error", async () => {
    rejectRequestActionMock.mockResolvedValue({ error: "No se pudo rechazar la solicitud." });
    render(<RequestRow {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /rechazar/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo rechazar la solicitud."),
    );
  });

  it("shows 'Privado' badge for private profiles", () => {
    render(<RequestRow {...defaultProps} isPublic={false} />);
    expect(screen.getByText("Privado")).toBeInTheDocument();
  });

  it("links to /u/<username>", () => {
    render(<RequestRow {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/u/alice");
  });

  it("shows initials avatar when avatarUrl is null", () => {
    render(<RequestRow {...defaultProps} />);
    expect(screen.getByText("al")).toBeInTheDocument();
  });
});
