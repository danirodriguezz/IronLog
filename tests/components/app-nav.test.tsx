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

  it("renders placeholder sections as disabled (not links)", () => {
    usePathname.mockReturnValue("/dashboard");
    render(<AppNav />);

    for (const label of ["Rutinas", "Entrenar", "Progreso"]) {
      const el = screen.getByText(label);
      expect(el.tagName).toBe("SPAN");
      expect(el).toHaveAttribute("aria-disabled");
    }
  });
});
