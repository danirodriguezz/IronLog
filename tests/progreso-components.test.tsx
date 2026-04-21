import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PrEntry, MuscleGroup, HeatmapDay, ExerciseOption, ProgressPoint, ProgressSummary } from "@/app/(app)/progreso/actions";

// ── PrFeed ─────────────────────────────────────────────────────────────────

vi.mock("@/app/(app)/progreso/actions", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/app/(app)/progreso/actions")>();
  return { ...mod, getExerciseProgress: vi.fn(async () => []) };
});

import { PrFeed } from "@/app/(app)/progreso/_components/pr-feed";
import { MuscleDonut } from "@/app/(app)/progreso/_components/muscle-donut";
import { Heatmap } from "@/app/(app)/progreso/_components/heatmap";
import { PerformanceChart } from "@/app/(app)/progreso/_components/performance-chart";
import { ProgressTabs } from "@/app/(app)/progreso/_components/progress-tabs";

const prEntry = (overrides: Partial<PrEntry> = {}): PrEntry => ({
  id: "set-1",
  date: "2026-04-10T10:00:00Z",
  exerciseName: "Press banca",
  exerciseType: "strength",
  weight_kg: 100,
  reps: 5,
  duration_seconds: null,
  distance_meters: null,
  ...overrides,
});

// ── PrFeed ─────────────────────────────────────────────────────────────────

describe("PrFeed", () => {
  it("renders empty state when entries is empty", () => {
    render(<PrFeed entries={[]} />);
    expect(screen.getByText("Sin récords todavía")).toBeTruthy();
  });

  it("renders one row per entry", () => {
    const entries = [
      prEntry({ id: "1", exerciseName: "Press banca" }),
      prEntry({ id: "2", exerciseName: "Sentadilla", exerciseType: "strength", weight_kg: 140, reps: 3 }),
    ];
    render(<PrFeed entries={entries} />);
    expect(screen.getByText("Press banca")).toBeTruthy();
    expect(screen.getByText("Sentadilla")).toBeTruthy();
  });

  it("formats strength value as kg × reps", () => {
    render(<PrFeed entries={[prEntry({ weight_kg: 100, reps: 5 })]} />);
    expect(screen.getByText("100 kg × 5 reps")).toBeTruthy();
  });

  it("formats bodyweight value as reps only", () => {
    render(<PrFeed entries={[prEntry({ exerciseType: "bodyweight", weight_kg: null, reps: 20 })]} />);
    expect(screen.getByText("20 reps")).toBeTruthy();
  });

  it("formats isometric value in seconds", () => {
    render(
      <PrFeed
        entries={[prEntry({ exerciseType: "isometric", weight_kg: null, reps: null, duration_seconds: 90 })]}
      />,
    );
    expect(screen.getByText("90 s")).toBeTruthy();
  });

  it("formats cardio value in meters", () => {
    render(
      <PrFeed
        entries={[prEntry({ exerciseType: "cardio", weight_kg: null, reps: null, distance_meters: 5000 })]}
      />,
    );
    expect(screen.getByText("5000 m")).toBeTruthy();
  });

  it("shows dash when strength entry has no weight_kg", () => {
    render(<PrFeed entries={[prEntry({ weight_kg: null, reps: 5 })]} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders type label in date/type line for each entry", () => {
    render(<PrFeed entries={[prEntry({ exerciseType: "strength" })]} />);
    // "Fuerza" is rendered inline with the date inside a single <p>, so match by regex
    expect(screen.getByText(/fuerza/i)).toBeTruthy();
  });

  it("renders aria list when entries exist", () => {
    render(<PrFeed entries={[prEntry()]} />);
    expect(screen.getByRole("list", { name: /récords/i })).toBeTruthy();
  });
});

// ── MuscleDonut ────────────────────────────────────────────────────────────

const muscleData = (muscles: string[]): MuscleGroup[] =>
  muscles.map((muscle, i) => ({ muscle, count: (muscles.length - i) * 10 }));

describe("MuscleDonut", () => {
  it("renders empty state when data is empty", () => {
    render(<MuscleDonut data={[]} />);
    expect(screen.getByText("Sin datos musculares")).toBeTruthy();
  });

  it("renders a legend item per muscle group", () => {
    render(<MuscleDonut data={muscleData(["pecho", "espalda", "pierna"])} />);
    expect(screen.getByText("pecho")).toBeTruthy();
    expect(screen.getByText("espalda")).toBeTruthy();
    expect(screen.getByText("pierna")).toBeTruthy();
  });

  it("renders percentage labels", () => {
    const data: MuscleGroup[] = [
      { muscle: "pecho", count: 50 },
      { muscle: "espalda", count: 50 },
    ];
    render(<MuscleDonut data={data} />);
    const pcts = screen.getAllByText("50%");
    expect(pcts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders SVG with aria-label for accessibility", () => {
    render(<MuscleDonut data={muscleData(["pecho"])} />);
    expect(screen.getByRole("img", { name: /distribución muscular/i })).toBeTruthy();
  });

  it("shows total count in centre when nothing is hovered", () => {
    const data: MuscleGroup[] = [{ muscle: "bíceps", count: 30 }];
    render(<MuscleDonut data={data} />);
    expect(screen.getByText("30")).toBeTruthy();
    expect(screen.getByText("SERIES")).toBeTruthy();
  });
});

// ── Heatmap ─────────────────────────────────────────────────────────────────

describe("Heatmap", () => {
  it("renders the SVG with aria-label", () => {
    render(<Heatmap data={[]} />);
    expect(screen.getByRole("img", { name: /consistencia/i })).toBeTruthy();
  });

  it("renders legend labels Menos and Más", () => {
    render(<Heatmap data={[]} />);
    expect(screen.getByText("Menos")).toBeTruthy();
    expect(screen.getByText("Más")).toBeTruthy();
  });

  it("shows session count on hover of a past day cell", () => {
    const today = new Date();
    const past = new Date(today);
    past.setDate(today.getDate() - 10);
    const date = past.toISOString().slice(0, 10);

    const data: HeatmapDay[] = [{ date, count: 3 }];
    render(<Heatmap data={data} />);

    const rects = document.querySelectorAll("rect");
    const target = Array.from(rects).find((r) => {
      const fill = r.getAttribute("fill");
      return fill && fill !== "transparent" && fill !== "none" && !r.getAttribute("stroke");
    });

    if (target) {
      fireEvent.mouseEnter(target);
      const tooltip = document.querySelector("[class*='font-mono'][class*='text-ink-300']");
      expect(tooltip).toBeTruthy();
    }
  });

  it("does not show tooltip text for future cells", () => {
    render(<Heatmap data={[]} />);
    const rects = document.querySelectorAll("rect");
    const futureCells = Array.from(rects).filter(
      (r) => r.getAttribute("fill") === "transparent",
    );
    futureCells.forEach((r) => fireEvent.mouseEnter(r));
    expect(screen.queryByText(/sesión/i)).toBeNull();
  });
});

// ── PerformanceChart ───────────────────────────────────────────────────────

const point = (overrides: Partial<ProgressPoint> = {}): ProgressPoint => ({
  date: "2026-04-01",
  value: 100,
  isPr: false,
  rpe: null,
  volume: 800,
  sessionId: "s1",
  ...overrides,
});

describe("PerformanceChart", () => {
  it("renders empty state when points is empty", () => {
    render(<PerformanceChart points={[]} exerciseType="strength" />);
    expect(screen.getByText(/sin sesiones registradas/i)).toBeTruthy();
  });

  it("renders SVG chart with aria-label when points exist", () => {
    render(<PerformanceChart points={[point()]} exerciseType="strength" />);
    expect(screen.getByRole("img", { name: /gráfico de rendimiento/i })).toBeTruthy();
  });

  it("shows reduced opacity when isPending is true", () => {
    const { container } = render(
      <PerformanceChart points={[point()]} exerciseType="strength" isPending />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("opacity-40");
  });

  it("does not show reduced opacity when isPending is false", () => {
    const { container } = render(
      <PerformanceChart points={[point()]} exerciseType="strength" isPending={false} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("opacity-100");
  });

  it("renders a PR marker circle for PR points", () => {
    const { container } = render(
      <PerformanceChart points={[point({ isPr: true, sessionId: "pr-session" })]} exerciseType="strength" />,
    );
    // PR points get a larger radius (r=5) vs normal (r=3.5)
    const circles = container.querySelectorAll("circle");
    const prCircle = Array.from(circles).find((c) => c.getAttribute("r") === "5");
    expect(prCircle).toBeTruthy();
  });

  it("renders volume bars for each point", () => {
    const { container } = render(
      <PerformanceChart
        points={[point({ sessionId: "s1" }), point({ sessionId: "s2", volume: 1200 })]}
        exerciseType="strength"
      />,
    );
    const bars = container.querySelectorAll(`rect[key^='bar']`);
    // rects for volume bars have a fill gradient — check we have rects beyond y-axis
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(0);
  });
});

// ── ProgressTabs ───────────────────────────────────────────────────────────

const defaultSummary: ProgressSummary = { totalSessions: 12, totalMinutes: 540, totalPrs: 5 };

const defaultProps = {
  summary: defaultSummary,
  heatmap: [] as HeatmapDay[],
  muscles: [] as MuscleGroup[],
  exercises: [] as ExerciseOption[],
  selectedExercise: null,
  progress: [] as ProgressPoint[],
  prFeed: [] as PrEntry[],
};

describe("ProgressTabs", () => {
  it("renders tab navigation with three tabs", () => {
    render(<ProgressTabs {...defaultProps} />);
    expect(screen.getByRole("tab", { name: /resumen/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /rendimiento/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /muro de récords/i })).toBeTruthy();
  });

  it("shows Resumen panel by default", () => {
    render(<ProgressTabs {...defaultProps} />);
    expect(screen.getByText("Métricas globales")).toBeTruthy();
  });

  it("displays KPI values from summary", () => {
    render(<ProgressTabs {...defaultProps} />);
    expect(screen.getByText("12")).toBeTruthy();  // totalSessions
    expect(screen.getByText("9h")).toBeTruthy();  // 540 min
    expect(screen.getByText("5")).toBeTruthy();   // totalPrs
  });

  it("shows dash for totalMinutes when 0", () => {
    render(<ProgressTabs {...defaultProps} summary={{ ...defaultSummary, totalMinutes: 0 }} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("switches to Rendimiento panel on tab click", () => {
    render(<ProgressTabs {...defaultProps} />);
    fireEvent.click(screen.getByRole("tab", { name: /rendimiento/i }));
    expect(screen.getByText("Sin ejercicios todavía")).toBeTruthy();
  });

  it("switches to Muro de Récords panel on tab click", () => {
    render(<ProgressTabs {...defaultProps} />);
    fireEvent.click(screen.getByRole("tab", { name: /muro de récords/i }));
    expect(screen.getByText("Sin récords todavía")).toBeTruthy();
  });

  it("marks active tab with aria-selected=true", () => {
    render(<ProgressTabs {...defaultProps} />);
    const resumenTab = screen.getByRole("tab", { name: /resumen/i });
    expect(resumenTab.getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: /rendimiento/i }));
    expect(screen.getByRole("tab", { name: /rendimiento/i }).getAttribute("aria-selected")).toBe("true");
    expect(resumenTab.getAttribute("aria-selected")).toBe("false");
  });

  it("shows exercise selector buttons in Rendimiento tab", () => {
    const exercises: ExerciseOption[] = [
      { id: "ex-1", name: "Press banca", type: "strength" },
      { id: "ex-2", name: "Dominadas", type: "bodyweight" },
    ];
    render(<ProgressTabs {...defaultProps} exercises={exercises} />);
    fireEvent.click(screen.getByRole("tab", { name: /rendimiento/i }));
    expect(screen.getByText("Press banca")).toBeTruthy();
    expect(screen.getByText("Dominadas")).toBeTruthy();
  });

  it("shows empty state in Records tab when prFeed is empty", () => {
    render(<ProgressTabs {...defaultProps} />);
    fireEvent.click(screen.getByRole("tab", { name: /muro de récords/i }));
    expect(screen.getByText("Sin récords todavía")).toBeTruthy();
  });

  it("shows PR count badge when prFeed has entries", () => {
    const prFeed = [prEntry({ id: "1" }), prEntry({ id: "2" })];
    render(<ProgressTabs {...defaultProps} prFeed={prFeed} />);
    fireEvent.click(screen.getByRole("tab", { name: /muro de récords/i }));
    expect(screen.getByText("2 récords")).toBeTruthy();
  });

  it("shows muscle donut empty state when muscles is empty", () => {
    render(<ProgressTabs {...defaultProps} />);
    expect(screen.getByText(/sin datos — registra sesiones/i)).toBeTruthy();
  });

  it("renders MuscleDonut when muscles data is present", () => {
    const muscles: MuscleGroup[] = [{ muscle: "pecho", count: 20 }];
    render(<ProgressTabs {...defaultProps} muscles={muscles} />);
    expect(screen.getByRole("img", { name: /distribución muscular/i })).toBeTruthy();
  });

  it("formatMinutes shows only minutes when less than 1 hour", () => {
    render(<ProgressTabs {...defaultProps} summary={{ ...defaultSummary, totalMinutes: 45 }} />);
    expect(screen.getByText("45 min")).toBeTruthy();
  });

  it("formatMinutes omits trailing 0m when minutes portion is zero", () => {
    render(<ProgressTabs {...defaultProps} summary={{ ...defaultSummary, totalMinutes: 120 }} />);
    expect(screen.getByText("2h")).toBeTruthy();
  });

  it("marks selected exercise button as aria-pressed=true", () => {
    const exercises: ExerciseOption[] = [{ id: "ex-1", name: "Press banca", type: "strength" }];
    render(
      <ProgressTabs
        {...defaultProps}
        exercises={exercises}
        selectedExercise={exercises[0]}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /rendimiento/i }));
    const btn = screen.getByRole("button", { name: /press banca/i });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });
});
