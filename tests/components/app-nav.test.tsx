import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("@/components/brand/logo", () => ({
  Logo: () => <svg data-testid="logo" />,
}));

vi.mock("@/components/ui/logout-button", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

import { AppHeader } from "@/app/(app)/_components/app-nav";

describe("AppHeader nav links", () => {
  it("marks the dashboard link as current when on /dashboard", () => {
    usePathname.mockReturnValue("/dashboard");
    render(<AppHeader />);

    const links = screen.getAllByRole("link", { name: "Panel" });
    expect(links[0]).toHaveAttribute("href", "/dashboard");
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });

  it("does not mark the dashboard link as current on other routes", () => {
    usePathname.mockReturnValue("/rutinas");
    render(<AppHeader />);

    const links = screen.getAllByRole("link", { name: "Panel" });
    expect(links[0]).not.toHaveAttribute("aria-current");
  });

  it("renders Progreso as a link", () => {
    usePathname.mockReturnValue("/dashboard");
    render(<AppHeader />);

    const links = screen.getAllByRole("link", { name: "Progreso" });
    expect(links[0]).toHaveAttribute("href", "/progreso");
  });

  it("renders Rutinas and Entrenar as links", () => {
    usePathname.mockReturnValue("/dashboard");
    render(<AppHeader />);

    const rutinas = screen.getAllByRole("link", { name: "Rutinas" });
    expect(rutinas[0]).toHaveAttribute("href", "/rutinas");

    const entrenar = screen.getAllByRole("link", { name: "Entrenar" });
    expect(entrenar[0]).toHaveAttribute("href", "/entrenar");
  });

  it("marks Entrenar as current when inside the training section", () => {
    usePathname.mockReturnValue("/entrenar/historial/abc");
    render(<AppHeader />);

    const links = screen.getAllByRole("link", { name: "Entrenar" });
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });

  it("marks Rutinas as current when inside the routines section", () => {
    usePathname.mockReturnValue("/rutinas/abc-123");
    render(<AppHeader />);

    const links = screen.getAllByRole("link", { name: "Rutinas" });
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });
});
