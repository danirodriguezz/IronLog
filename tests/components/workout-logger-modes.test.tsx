import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/(app)/entrenar/actions", () => ({
  saveDraftAction: vi.fn(async () => ({ success: "ok" })),
  finishSessionAction: vi.fn(async () => ({ success: "ok" })),
  saveCompletedEditAction: vi.fn(async () => ({ success: "ok" })),
  discardSessionAction: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

import { WorkoutLogger, type LoggerExercise } from "@/app/(app)/entrenar/[sessionId]/_components/workout-logger";

const exercise = (overrides: Partial<LoggerExercise> = {}): LoggerExercise => ({
  sessionExerciseId: "se-1",
  exerciseId: "ex-1",
  name: "Press banca",
  muscle: "Pecho",
  type: "strength",
  targetSets: 3,
  targetReps: 8,
  targetWeightKg: 80,
  targetDurationSeconds: null,
  last: null,
  draftSets: [],
  ...overrides,
});

// A date clearly in the past (not today)
const PAST_DATE = "2020-03-15T12:00:00.000Z";

// A date that is always today (for "active session" tests)
const todayISO = () => new Date().toISOString();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WorkoutLogger — past session display", () => {
  it("shows 'Sesión pasada' label instead of the timer for a past-day session", () => {
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[exercise()]}
        startedAt={PAST_DATE}
      />,
    );
    expect(screen.getByText(/sesión pasada/i)).toBeTruthy();
    // The live timer text should not appear (it would look like "0:00" or similar digits)
    expect(screen.queryByText(/^\d+:\d{2}$/)).toBeNull();
  });

  it("shows the live timer for a session started today", () => {
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[exercise()]}
        startedAt={todayISO()}
      />,
    );
    expect(screen.queryByText(/sesión pasada/i)).toBeNull();
    // Timer renders as M:SS or H:MM:SS
    expect(screen.getByText(/^\d+:\d{2}/)).toBeTruthy();
  });

  it("shows the duration input for a past-day session", () => {
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[exercise()]}
        startedAt={PAST_DATE}
      />,
    );
    expect(screen.getByLabelText(/duración/i)).toBeTruthy();
  });

  it("does not show the duration input for a session started today", () => {
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[exercise()]}
        startedAt={todayISO()}
      />,
    );
    expect(screen.queryByLabelText(/duración/i)).toBeNull();
  });

  it("pre-fills the duration input from endedAt when provided", () => {
    // started 2020-03-15 12:00 UTC, ended 2020-03-15 13:30 UTC → 90 min
    const endedAt = "2020-03-15T13:30:00.000Z";
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[exercise()]}
        startedAt={PAST_DATE}
        endedAt={endedAt}
      />,
    );
    const input = screen.getByLabelText(/duración/i) as HTMLInputElement;
    expect(input.value).toBe("90");
  });

  it("leaves duration input empty when endedAt is not provided", () => {
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[exercise()]}
        startedAt={PAST_DATE}
      />,
    );
    const input = screen.getByLabelText(/duración/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });
});

describe("WorkoutLogger — editing mode", () => {
  it("shows 'Cancelar edición' and 'Guardar cambios' when isEditing", () => {
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[exercise()]}
        startedAt={PAST_DATE}
        isEditing
      />,
    );
    expect(screen.getByRole("button", { name: /cancelar edición/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /descartar entreno/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /guardar entreno/i })).toBeNull();
  });

  it("shows 'Descartar entreno' and 'Guardar entreno' in normal mode", () => {
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[exercise()]}
        startedAt={PAST_DATE}
      />,
    );
    expect(screen.getByRole("button", { name: /descartar entreno/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /guardar entreno/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /cancelar edición/i })).toBeNull();
  });

  it("shows empty-exercise notice when exercises array is empty", () => {
    render(
      <WorkoutLogger
        sessionId="s-1"
        exercises={[]}
        startedAt={PAST_DATE}
      />,
    );
    expect(screen.getByText(/no tiene ejercicios/i)).toBeTruthy();
  });
});
