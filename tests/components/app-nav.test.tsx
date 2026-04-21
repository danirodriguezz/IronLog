import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

import { AppNav } from "@/app/(app)/_components/app-nav";

describe("AppNav", () => {
  it("marks the dashboard link as current when on /dashboard", () => {
    usePathname.mockReturnValue("/dashboard");
    render(<AppNav />);

    const link = screen.getByRole("link", { name: "Panel" });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("does not mark the dashboard link as current on other routes", () => {
    usePathname.mockReturnValue("/rutinas");
    render(<AppNav />);

    const link = screen.getByRole("link", { name: "Panel" });
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("renders upcoming sections as disabled (not links)", () => {
    usePathname.mockReturnValue("/dashboard");
    render(<AppNav />);

    const el = screen.getByText("Progreso");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveAttribute("aria-disabled");
  });

  it("renders Rutinas and Entrenar as links", () => {
    usePathname.mockReturnValue("/dashboard");
    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Rutinas" })).toHaveAttribute(
      "href",
      "/rutinas",
    );
    expect(screen.getByRole("link", { name: "Entrenar" })).toHaveAttribute(
      "href",
      "/entrenar",
    );
  });

  it("marks Entrenar as current when inside the training section", () => {
    usePathname.mockReturnValue("/entrenar/historial/abc");
    render(<AppNav />);

    const link = screen.getByRole("link", { name: "Entrenar" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("marks Rutinas as current when inside the routines section", () => {
    usePathname.mockReturnValue("/rutinas/abc-123");
    render(<AppNav />);

    const link = screen.getByRole("link", { name: "Rutinas" });
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
