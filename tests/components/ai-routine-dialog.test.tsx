import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { generateRoutinePlanMock, applyAIRoutinePlanMock } = vi.hoisted(() => ({
  generateRoutinePlanMock: vi.fn(),
  applyAIRoutinePlanMock: vi.fn(),
}));

vi.mock("@/app/(app)/rutinas/ai-actions", () => ({
  generateRoutinePlan: generateRoutinePlanMock,
  applyAIRoutinePlan: applyAIRoutinePlanMock,
}));

import { AIRoutineDialog } from "@/app/(app)/rutinas/_components/ai-routine-dialog";
import type { AIRoutinePlan, CatalogEntry } from "@/app/(app)/rutinas/ai-actions";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const catalog: CatalogEntry[] = [
  { id: "ex-1", name: "Press de banca", target_muscle: "Pecho", type: "strength" },
  { id: "ex-2", name: "Cardio HIIT", target_muscle: "Cardio", type: "cardio" },
];

const emptyPlan: AIRoutinePlan = {
  summary: "Plan adaptado para definición.",
  modifications: [],
  additions: [],
  newRoutines: [],
};

const richPlan: AIRoutinePlan = {
  summary: "Reducimos el volumen de fuerza y añadimos cardio.",
  modifications: [
    {
      routineExerciseId: "re-1",
      exerciseName: "Press de banca",
      kind: "change_reps",
      rationale: "Más reps para tonificación.",
      proposed: { target_sets: null, target_reps: 15, target_weight_kg: null, target_duration_seconds: null, notes: null },
    },
    {
      routineExerciseId: "re-2",
      exerciseName: "Sentadilla",
      kind: "remove",
      rationale: "Eliminar para reducir volumen.",
      proposed: { target_sets: null, target_reps: null, target_weight_kg: null, target_duration_seconds: null, notes: null },
    },
  ],
  additions: [
    {
      routineId: "routine-1",
      exerciseName: "Cardio HIIT",
      rationale: "Cardio de alta intensidad para quemar grasa.",
      target_sets: null, target_reps: null, target_weight_kg: null,
      target_duration_seconds: 1800, notes: null,
    },
  ],
  newRoutines: [
    {
      name: "Cardio Viernes",
      description: "Sesión ligera.",
      day_of_week: 5,
      rationale: "Sesión extra de cardio.",
      exercises: [
        { exerciseName: "Cardio HIIT", target_sets: null, target_reps: null, target_weight_kg: null, target_duration_seconds: 1800, notes: null },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Trigger button ───────────────────────────────────────────────────────────

describe("AIRoutineDialog — trigger button", () => {
  it("renders the trigger button", () => {
    render(<AIRoutineDialog />);
    expect(screen.getByRole("button", { name: /modificar con ia/i })).toBeInTheDocument();
  });

  it("is disabled with title tooltip when routineCount is 0", () => {
    render(<AIRoutineDialog routineCount={0} />);
    const btn = screen.getByRole("button", { name: /modificar con ia/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("title", "Crea una rutina primero");
  });

  it("is enabled when routineCount is greater than 0", () => {
    render(<AIRoutineDialog routineCount={3} />);
    expect(screen.getByRole("button", { name: /modificar con ia/i })).not.toBeDisabled();
  });

  it("is enabled when routineCount is undefined", () => {
    render(<AIRoutineDialog />);
    expect(screen.getByRole("button", { name: /modificar con ia/i })).not.toBeDisabled();
  });

  it("opens the dialog when the trigger button is clicked", async () => {
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);

    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not open dialog when disabled (routineCount=0)", async () => {
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={0} />);

    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ─── Dialog content — idle phase ─────────────────────────────────────────────

describe("AIRoutineDialog — idle phase", () => {
  const openDialog = async () => {
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    return user;
  };

  it("shows the textarea and submit button when dialog opens", async () => {
    await openDialog();

    expect(screen.getByLabelText(/tu objetivo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analizar y planificar/i })).toBeInTheDocument();
  });

  it("shows a contextual title for the list-page variant (no routineId)", async () => {
    await openDialog();
    expect(screen.getByText(/adapta tu semana/i)).toBeInTheDocument();
  });

  it("shows a contextual title when routineId is provided", async () => {
    const user = userEvent.setup();
    render(<AIRoutineDialog routineId="routine-1" />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    expect(screen.getByText(/optimiza esta rutina/i)).toBeInTheDocument();
  });

  it("closes the dialog via the Escape key", async () => {
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the dialog via the close (×) button", async () => {
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));

    // The × close button is inside the dialog panel (not the backdrop)
    const closeButtons = screen.getAllByRole("button", { name: /cerrar/i });
    const panelCloseBtn = closeButtons.find((b) => b.tagName === "BUTTON" && !b.className.includes("absolute"));
    await user.click(panelCloseBtn ?? closeButtons[closeButtons.length - 1]);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not submit when the textarea is empty", async () => {
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));

    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));

    expect(generateRoutinePlanMock).not.toHaveBeenCalled();
  });
});

// ─── Dialog content — loading phase ──────────────────────────────────────────

describe("AIRoutineDialog — loading phase", () => {
  it("calls generateRoutinePlan with the user objective on submit", async () => {
    generateRoutinePlanMock.mockResolvedValue({ ok: true, plan: emptyPlan, catalogSnapshot: catalog });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));

    await user.type(screen.getByLabelText(/tu objetivo/i), "quiero definición");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));

    expect(generateRoutinePlanMock).toHaveBeenCalledWith("quiero definición", undefined);
  });

  it("passes the routineId to generateRoutinePlan when in focused mode", async () => {
    generateRoutinePlanMock.mockResolvedValue({ ok: true, plan: emptyPlan, catalogSnapshot: catalog });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineId="routine-1" />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));

    await user.type(screen.getByLabelText(/tu objetivo/i), "optimizar empuje");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));

    expect(generateRoutinePlanMock).toHaveBeenCalledWith("optimizar empuje", "routine-1");
  });
});

// ─── Dialog content — preview phase ──────────────────────────────────────────

describe("AIRoutineDialog — preview phase", () => {
  const renderPreview = async (plan: AIRoutinePlan = richPlan) => {
    generateRoutinePlanMock.mockResolvedValue({ ok: true, plan, catalogSnapshot: catalog });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    await user.type(screen.getByLabelText(/tu objetivo/i), "quiero definición");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));
    await waitFor(() => expect(screen.queryByText(plan.summary)).toBeInTheDocument());
    return user;
  };

  it("shows the plan summary after a successful AI call", async () => {
    await renderPreview();
    expect(screen.getByText("Reducimos el volumen de fuerza y añadimos cardio.")).toBeInTheDocument();
  });

  it("shows modification items in the preview", async () => {
    await renderPreview();
    expect(screen.getByText("Press de banca")).toBeInTheDocument();
    expect(screen.getByText("Sentadilla")).toBeInTheDocument();
  });

  it("shows additions in the preview", async () => {
    await renderPreview();
    // Cardio HIIT appears in both additions and newRoutines — check at least one exists
    expect(screen.getAllByText("Cardio HIIT").length).toBeGreaterThanOrEqual(1);
  });

  it("shows new routines with 'NUEVA' badge in the preview", async () => {
    await renderPreview();
    expect(screen.getByText("Cardio Viernes")).toBeInTheDocument();
    expect(screen.getByText("Nueva")).toBeInTheDocument();
  });

  it("shows the correct change count on the apply button", async () => {
    await renderPreview();
    // richPlan: 2 modifications + 1 addition + 1 newRoutine = 4
    expect(screen.getByRole("button", { name: /aplicar 4 cambios/i })).toBeInTheDocument();
  });

  it("shows 'Sin cambios' label when the plan has no changes", async () => {
    await renderPreview(emptyPlan);
    expect(screen.getByRole("button", { name: /sin cambios/i })).toBeInTheDocument();
  });

  it("shows the 'Descartar' button in preview", async () => {
    await renderPreview();
    expect(screen.getByRole("button", { name: /descartar/i })).toBeInTheDocument();
  });

  it("closes the dialog when 'Descartar' is clicked", async () => {
    const user = await renderPreview();
    await user.click(screen.getByRole("button", { name: /descartar/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls applyAIRoutinePlan when 'Aplicar' is clicked", async () => {
    applyAIRoutinePlanMock.mockResolvedValue({
      ok: true,
      stats: { modified: 2, added: 1, created: 1, removed: 0, unresolved: [] },
    });
    const user = await renderPreview();

    await user.click(screen.getByRole("button", { name: /aplicar 4 cambios/i }));

    expect(applyAIRoutinePlanMock).toHaveBeenCalledWith(richPlan, catalog);
  });
});

// ─── Dialog content — done phase ─────────────────────────────────────────────

describe("AIRoutineDialog — done phase", () => {
  const applyAndFinish = async (stats = { modified: 2, added: 1, created: 1, removed: 0, unresolved: [] as string[] }) => {
    generateRoutinePlanMock.mockResolvedValue({ ok: true, plan: richPlan, catalogSnapshot: catalog });
    applyAIRoutinePlanMock.mockResolvedValue({ ok: true, stats });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    await user.type(screen.getByLabelText(/tu objetivo/i), "definición");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));
    await waitFor(() => screen.getByRole("button", { name: /aplicar/i }));
    await user.click(screen.getByRole("button", { name: /aplicar 4 cambios/i }));
    await waitFor(() => screen.getByText(/plan aplicado/i));
    return user;
  };

  it("shows 'Plan aplicado.' after a successful apply", async () => {
    await applyAndFinish();
    expect(screen.getByText("Plan aplicado.")).toBeInTheDocument();
  });

  it("shows the stats summary with correct counts", async () => {
    await applyAndFinish({ modified: 2, added: 1, created: 1, removed: 0, unresolved: [] });
    expect(screen.getByText(/2 ejercicios modificados/i)).toBeInTheDocument();
    expect(screen.getByText(/1 añadido/i)).toBeInTheDocument();
    expect(screen.getByText(/1 rutina creada/i)).toBeInTheDocument();
  });

  it("shows unresolved exercises when present", async () => {
    await applyAndFinish({ modified: 0, added: 0, created: 0, removed: 0, unresolved: ["Ejercicio Inventado"] });
    expect(screen.getByText(/ejercicio inventado/i)).toBeInTheDocument();
  });

  it("closes the dialog when the 'Cerrar' button is clicked", async () => {
    const user = await applyAndFinish();
    // In done phase the backdrop is still present (aria-label=Cerrar), target the visible Cerrar button
    const closeButtons = screen.getAllByRole("button", { name: /cerrar/i });
    await user.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ─── Dialog content — error phase ────────────────────────────────────────────

describe("AIRoutineDialog — error phase", () => {
  it("shows an error message when generateRoutinePlan returns no_routines", async () => {
    generateRoutinePlanMock.mockResolvedValue({ ok: false, reason: "no_routines" });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    await user.type(screen.getByLabelText(/tu objetivo/i), "definición");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));

    await waitFor(() => expect(screen.getByText(/crea al menos una rutina/i)).toBeInTheDocument());
  });

  it("shows an error message when generateRoutinePlan returns error", async () => {
    generateRoutinePlanMock.mockResolvedValue({ ok: false, reason: "error" });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    await user.type(screen.getByLabelText(/tu objetivo/i), "definición");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));

    await waitFor(() => expect(screen.getByText(/no se pudo conectar/i)).toBeInTheDocument());
  });

  it("shows a 'Reintentar' button in the error phase", async () => {
    generateRoutinePlanMock.mockResolvedValue({ ok: false, reason: "error" });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    await user.type(screen.getByLabelText(/tu objetivo/i), "definición");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument());
  });

  it("goes back to idle phase when 'Reintentar' is clicked", async () => {
    generateRoutinePlanMock.mockResolvedValue({ ok: false, reason: "error" });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    await user.type(screen.getByLabelText(/tu objetivo/i), "definición");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));

    await waitFor(() => screen.getByRole("button", { name: /reintentar/i }));
    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(screen.getByLabelText(/tu objetivo/i)).toBeInTheDocument();
  });

  it("shows an error when applyAIRoutinePlan fails", async () => {
    generateRoutinePlanMock.mockResolvedValue({ ok: true, plan: richPlan, catalogSnapshot: catalog });
    applyAIRoutinePlanMock.mockResolvedValue({ ok: false, reason: "Error al aplicar los cambios." });
    const user = userEvent.setup();
    render(<AIRoutineDialog routineCount={2} />);
    await user.click(screen.getByRole("button", { name: /modificar con ia/i }));
    await user.type(screen.getByLabelText(/tu objetivo/i), "definición");
    await user.click(screen.getByRole("button", { name: /analizar y planificar/i }));
    await waitFor(() => screen.getByRole("button", { name: /aplicar 4 cambios/i }));
    await user.click(screen.getByRole("button", { name: /aplicar 4 cambios/i }));

    await waitFor(() => expect(screen.getByText(/error al aplicar/i)).toBeInTheDocument());
  });
});
