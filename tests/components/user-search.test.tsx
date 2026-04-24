import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const { searchUsersMock, usePathnameMock } = vi.hoisted(() => ({
  searchUsersMock: vi.fn(),
  usePathnameMock: vi.fn(() => "/dashboard"),
}));

vi.mock("@/app/(app)/_actions/users", () => ({
  searchUsers: searchUsersMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { UserSearch } from "@/app/(app)/_components/user-search";

beforeEach(() => {
  vi.clearAllMocks();
  usePathnameMock.mockReturnValue("/dashboard");
});

const openSearch = (): void => {
  fireEvent.click(screen.getByRole("button", { name: /buscar usuarios/i }));
};

describe("UserSearch", () => {
  it("renders icon trigger button", () => {
    render(<UserSearch />);
    expect(screen.getByRole("button", { name: /buscar usuarios/i })).toBeInTheDocument();
  });

  it("opens modal on button click", () => {
    render(<UserSearch />);
    openSearch();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens modal on Cmd+K", () => {
    render(<UserSearch />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens modal on Ctrl+K", () => {
    render(<UserSearch />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes modal on Escape key", () => {
    render(<UserSearch />);
    openSearch();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes modal on backdrop click", () => {
    render(<UserSearch />);
    openSearch();
    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close modal when clicking inside the panel", () => {
    render(<UserSearch />);
    openSearch();
    const input = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.click(input);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows hint text when query length < 2", () => {
    render(<UserSearch />);
    openSearch();
    const input = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(input, { target: { value: "a" } });
    expect(screen.getByText(/al menos 2 caracteres/i)).toBeInTheDocument();
    expect(searchUsersMock).not.toHaveBeenCalled();
  });

  it("does NOT call searchUsers before debounce fires", () => {
    render(<UserSearch />);
    openSearch();
    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: "al" },
    });
    expect(searchUsersMock).not.toHaveBeenCalled();
  });

  it("calls searchUsers after 200ms debounce", async () => {
    searchUsersMock.mockResolvedValue([]);
    render(<UserSearch />);
    openSearch();
    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: "al" },
    });
    await waitFor(() => expect(searchUsersMock).toHaveBeenCalledWith("al"), {
      timeout: 1000,
    });
  });

  it("renders result items with username and link", async () => {
    searchUsersMock.mockResolvedValue([
      { id: "u1", username: "alice", full_name: "Alice Smith", avatar_url: null, is_public: true },
    ]);
    render(<UserSearch />);
    openSearch();
    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: "al" },
    });
    await waitFor(() => expect(screen.getByText("@alice")).toBeInTheDocument(), {
      timeout: 1000,
    });
    expect(screen.getByRole("link", { name: /@alice/i })).toHaveAttribute("href", "/u/alice");
  });

  it("shows 'Privado' badge for private profiles in results", async () => {
    searchUsersMock.mockResolvedValue([
      { id: "u2", username: "bob", full_name: null, avatar_url: null, is_public: false },
    ]);
    render(<UserSearch />);
    openSearch();
    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: "bo" },
    });
    await waitFor(() => expect(screen.getByText("Privado")).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("shows empty state when no results", async () => {
    searchUsersMock.mockResolvedValue([]);
    render(<UserSearch />);
    openSearch();
    fireEvent.change(screen.getByPlaceholderText(/buscar por nombre/i), {
      target: { value: "zzz" },
    });
    await waitFor(() => expect(screen.getByText(/sin resultados/i)).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("closes modal on pathname change", async () => {
    const { rerender } = render(<UserSearch />);
    openSearch();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    usePathnameMock.mockReturnValue("/rutinas");
    await act(async () => { rerender(<UserSearch />); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders full variant with text label", () => {
    render(<UserSearch variant="full" />);
    expect(screen.getByText(/buscar usuarios/i)).toBeInTheDocument();
  });
});
