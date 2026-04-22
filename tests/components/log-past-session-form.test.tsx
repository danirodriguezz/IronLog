import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/app/(app)/entrenar/actions", () => ({
  logPastSessionAction: vi.fn(),
}));

import { LogPastSessionForm } from "@/app/(app)/entrenar/_components/log-past-session-form";

const routines = [
  { id: "rt-1", name: "Empuje" },
  { id: "rt-2", name: "Tirón" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LogPastSessionForm", () => {
  it("renders only the toggle button initially", () => {
    render(<LogPastSessionForm routines={routines} hasActiveSession={false} />);
    expect(screen.getByRole("button", { name: /añadir sesión pasada/i })).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("toggle button is disabled when hasActiveSession is true", () => {
    render(<LogPastSessionForm routines={routines} hasActiveSession={true} />);
    const btn = screen.getByRole("button", { name: /añadir sesión pasada/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens the form when the toggle button is clicked", () => {
    render(<LogPastSessionForm routines={routines} hasActiveSession={false} />);
    fireEvent.click(screen.getByRole("button", { name: /añadir sesión pasada/i }));
    expect(screen.getByLabelText(/fecha del entreno/i)).toBeTruthy();
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("renders a date input with max set to today", () => {
    render(<LogPastSessionForm routines={routines} hasActiveSession={false} />);
    fireEvent.click(screen.getByRole("button", { name: /añadir sesión pasada/i }));

    const dateInput = screen.getByLabelText(/fecha del entreno/i) as HTMLInputElement;
    const todayISO = new Date().toISOString().split("T")[0];
    expect(dateInput.max).toBe(todayISO);
    expect(dateInput.type).toBe("date");
    expect(dateInput.required).toBe(true);
  });

  it("renders all routines as select options", () => {
    render(<LogPastSessionForm routines={routines} hasActiveSession={false} />);
    fireEvent.click(screen.getByRole("button", { name: /añadir sesión pasada/i }));

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.text);
    expect(options).toContain("Empuje");
    expect(options).toContain("Tirón");
  });

  it("select is required", () => {
    render(<LogPastSessionForm routines={routines} hasActiveSession={false} />);
    fireEvent.click(screen.getByRole("button", { name: /añadir sesión pasada/i }));

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.required).toBe(true);
  });

  it("closes the form when cancel is clicked", () => {
    render(<LogPastSessionForm routines={routines} hasActiveSession={false} />);
    fireEvent.click(screen.getByRole("button", { name: /añadir sesión pasada/i }));
    expect(screen.getByRole("combobox")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("button", { name: /añadir sesión pasada/i })).toBeTruthy();
  });

  it("renders a submit button inside the form", () => {
    render(<LogPastSessionForm routines={routines} hasActiveSession={false} />);
    fireEvent.click(screen.getByRole("button", { name: /añadir sesión pasada/i }));
    expect(screen.getByRole("button", { name: /registrar/i })).toBeTruthy();
  });

  it("renders empty select when routines list is empty", () => {
    render(<LogPastSessionForm routines={[]} hasActiveSession={false} />);
    fireEvent.click(screen.getByRole("button", { name: /añadir sesión pasada/i }));

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    // Only the placeholder option should exist
    expect(select.options).toHaveLength(1);
    expect(select.options[0].value).toBe("");
  });
});
