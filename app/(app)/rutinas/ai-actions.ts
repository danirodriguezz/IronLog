"use server";

import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchUserContextForAI } from "@/app/(app)/coach/ai-actions";

const groq = createGroq();

// ── Types ─────────────────────────────────────────────────────────────────────

export type CatalogEntry = {
  id: string;
  name: string;
  target_muscle: string | null;
  type: string;
};

// ── Schema ────────────────────────────────────────────────────────────────────

const exerciseModificationSchema = z.object({
  routineExerciseId: z.string(),
  exerciseName: z.string(),
  kind: z.enum([
    "increase_weight",
    "decrease_weight",
    "change_reps",
    "change_sets",
    "add_note",
    "remove",
  ]),
  rationale: z.string(),
  proposed: z.object({
    target_sets: z.number().int().positive().nullable(),
    target_reps: z.number().int().positive().nullable(),
    target_weight_kg: z.number().positive().nullable(),
    target_duration_seconds: z.number().int().positive().nullable(),
    notes: z.string().nullable(),
  }),
});

const exerciseAdditionSchema = z.object({
  routineId: z.string(),
  exerciseName: z.string(),
  rationale: z.string(),
  target_sets: z.number().int().positive().nullable(),
  target_reps: z.number().int().positive().nullable(),
  target_weight_kg: z.number().positive().nullable(),
  target_duration_seconds: z.number().int().positive().nullable(),
  notes: z.string().nullable(),
});

const newRoutineExerciseSchema = z.object({
  exerciseName: z.string(),
  target_sets: z.number().int().positive().nullable(),
  target_reps: z.number().int().positive().nullable(),
  target_weight_kg: z.number().positive().nullable(),
  target_duration_seconds: z.number().int().positive().nullable(),
  notes: z.string().nullable(),
});

const newRoutineSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  day_of_week: z.number().int().min(1).max(7).nullable(),
  rationale: z.string(),
  exercises: z.array(newRoutineExerciseSchema),
});

const aiRoutinePlanSchema = z.object({
  summary: z.string(),
  modifications: z.array(exerciseModificationSchema),
  additions: z.array(exerciseAdditionSchema),
  newRoutines: z.array(newRoutineSchema),
});

export type AIRoutinePlan = z.infer<typeof aiRoutinePlanSchema>;
export type ExerciseModification = z.infer<typeof exerciseModificationSchema>;
export type ExerciseAddition = z.infer<typeof exerciseAdditionSchema>;
export type NewRoutine = z.infer<typeof newRoutineSchema>;

// ── Generate plan ─────────────────────────────────────────────────────────────

export type RoutinePlanResult =
  | { ok: true; plan: AIRoutinePlan; catalogSnapshot: CatalogEntry[] }
  | { ok: false; reason: "unauthenticated" | "no_routines" | "error" };

export const generateRoutinePlan = async (
  userObjective: string,
  focusRoutineId?: string,
): Promise<RoutinePlanResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const [context, catalogResult] = await Promise.all([
    fetchUserContextForAI(),
    supabase
      .from("exercises")
      .select("id, name, target_muscle, type")
      .order("name")
      .returns<CatalogEntry[]>(),
  ]);

  if (!context) return { ok: false, reason: "error" };

  const catalog = catalogResult.data ?? [];
  const allRoutines = context.routines;

  if (allRoutines.length === 0) return { ok: false, reason: "no_routines" };

  const routinesToShow = focusRoutineId
    ? allRoutines.filter((r) => r.id === focusRoutineId)
    : allRoutines;

  const routinesSummary = routinesToShow
    .map((r) => {
      const dayLabel = r.day_of_week
        ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][r.day_of_week - 1]
        : "Sin día";
      const exList = r.exercises
        .map(
          (e) =>
            `    • ${e.exercise_name ?? e.exercise_id} [reid:${e.id}] — ${e.target_sets ?? "?"}s × ${e.target_reps ?? "?"}r @ ${e.target_weight_kg ?? "?"}kg`,
        )
        .join("\n");
      return `[${dayLabel}] ${r.name} (rid:${r.id})\n${exList || "    Sin ejercicios"}`;
    })
    .join("\n\n");

  // Build catalog summary grouped by target_muscle + type (~800 tokens)
  const groupMap = new Map<string, string[]>();
  for (const ex of catalog) {
    const key = `${ex.target_muscle ?? "Otro"} · ${ex.type}`;
    const arr = groupMap.get(key) ?? [];
    arr.push(ex.name);
    groupMap.set(key, arr);
  }
  const catalogSummary = Array.from(groupMap.entries())
    .map(([group, names]) => `${group}: ${names.join(", ")}`)
    .join("\n");

  const { profile, recentSessions, weeklyVolume, recentPrs } = context;

  const sessionsSummary =
    recentSessions.length > 0
      ? recentSessions
          .slice(0, 10)
          .map((s) => {
            const date = new Date(s.created_at).toLocaleDateString("es-ES");
            const dur =
              s.started_at && s.ended_at
                ? Math.round(
                    (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000,
                  ) + " min"
                : "duración desconocida";
            return `- ${date}: "${s.name ?? "Sin nombre"}" (${dur})`;
          })
          .join("\n")
      : "Sin sesiones registradas en los últimos 14 días.";

  const volumeSummary =
    weeklyVolume.length > 0
      ? weeklyVolume.map((v) => `- ${v.date}: ${v.volume_kg} kg`).join("\n")
      : "Sin datos de volumen.";

  const prsSummary =
    recentPrs.length > 0
      ? recentPrs
          .map((p) => {
            const val =
              p.exercise_type === "strength"
                ? `${p.weight_kg}kg × ${p.reps} reps`
                : p.exercise_type === "bodyweight"
                  ? `${p.reps} reps`
                  : p.exercise_type === "isometric"
                    ? `${p.duration_seconds}s`
                    : `${(Number(p.distance_meters) / 1000).toFixed(2)} km`;
            return `- ${p.exercise_name}: ${val}`;
          })
          .join("\n")
      : "Sin PRs recientes.";

  const assignedDays = new Set(allRoutines.map((r) => r.day_of_week).filter(Boolean));
  const freeDays = [1, 2, 3, 4, 5, 6, 7]
    .filter((d) => !assignedDays.has(d))
    .map((d) => ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][d - 1])
    .join(", ");

  const systemPrompt = `Eres un entrenador personal de élite. Tu tarea es revisar las rutinas del atleta y proponer un plan de modificación concreto basado en su objetivo específico.
Basa tus recomendaciones EXCLUSIVAMENTE en los datos que te proporciono. No inventes ejercicios ni IDs.

PERFIL DEL ATLETA:
- Objetivo principal: ${profile.primary_goal ?? profile.goal ?? "no especificado"}
- Objetivo secundario: ${profile.secondary_goal ?? "ninguno"}
- Nivel: ${profile.experience_level ?? "no especificado"}
- Peso corporal: ${profile.weight_kg ?? "?"}kg
- Sesiones objetivo/semana: ${profile.weekly_session_target ?? "no especificado"}
- Notas: ${profile.goal_notes ?? "ninguna"}

RENDIMIENTO RECIENTE:
Sesiones (últimos 14 días):
${sessionsSummary}

Volumen de fuerza por día:
${volumeSummary}

PRs recientes:
${prsSummary}

RUTINAS ACTUALES (usa los IDs [reid:xxx] y (rid:xxx) exactamente):
${routinesSummary || "Sin rutinas."}

Días de la semana libres (sin rutina asignada): ${freeDays || "ninguno"}

CATÁLOGO DE EJERCICIOS DISPONIBLES (usa EXACTAMENTE estos nombres al sugerir):
${catalogSummary}

INSTRUCCIONES:
1. modifications: Modifica ejercicios existentes usando [reid:xxx] exactamente. Solo si hay razón clara.
2. additions: Para añadir un ejercicio a una rutina existente, usa el (rid:xxx) exacto y el nombre EXACTO del catálogo.
3. newRoutines: Crea nuevas rutinas solo si el objetivo lo requiere y hay días libres. Usa nombres del catálogo.
4. summary: 2-3 frases en español explicando el plan y por qué se adapta al objetivo.
5. Responde siempre en español. Usa IDs exactamente como aparecen arriba.`;

  let plan: AIRoutinePlan;
  try {
    const { output } = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      output: Output.object({ schema: aiRoutinePlanSchema }),
      system: systemPrompt,
      prompt: `Mi objetivo concreto es: "${userObjective}"\n\nGenera el plan de modificación de rutinas para este objetivo.`,
    });
    plan = output;
  } catch (err) {
    console.error("[generateRoutinePlan] model error:", err);
    return { ok: false, reason: "error" };
  }

  // Server-side ownership validation
  const validReIds = new Set(allRoutines.flatMap((r) => r.exercises.map((e) => e.id)));
  const validRIds = new Set(allRoutines.map((r) => r.id));

  plan.modifications = plan.modifications.filter((m) => validReIds.has(m.routineExerciseId));
  plan.additions = plan.additions.filter((a) => validRIds.has(a.routineId));

  return { ok: true, plan, catalogSnapshot: catalog };
};

// ── Apply plan ────────────────────────────────────────────────────────────────

export type ApplyStats = {
  modified: number;
  added: number;
  created: number;
  removed: number;
  unresolved: string[];
};

export type ApplyPlanResult =
  | { ok: true; stats: ApplyStats }
  | { ok: false; reason: string; partial?: boolean };

export const applyAIRoutinePlan = async (
  plan: AIRoutinePlan,
  catalogSnapshot: CatalogEntry[],
): Promise<ApplyPlanResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // Re-fetch valid IDs from DB for security
  const [reResult, routinesResult] = await Promise.all([
    supabase.from("routine_exercises").select("id").eq("user_id", user.id),
    supabase.from("routines").select("id").eq("user_id", user.id),
  ]);

  const validReIds = new Set((reResult.data ?? []).map((r) => r.id));
  const validRIds = new Set((routinesResult.data ?? []).map((r) => r.id));

  // Build exercise name → ID lookup (case-insensitive)
  const nameToId = new Map<string, string>();
  for (const entry of catalogSnapshot) {
    nameToId.set(entry.name.toLowerCase(), entry.id);
  }

  const stats: ApplyStats = { modified: 0, added: 0, created: 0, removed: 0, unresolved: [] };

  // 1. Create new routines
  for (const nr of plan.newRoutines) {
    // Clear day conflict if needed
    if (nr.day_of_week !== null) {
      await supabase
        .from("routines")
        .update({ day_of_week: null })
        .eq("user_id", user.id)
        .eq("day_of_week", nr.day_of_week);
    }

    const { data: newRoutine, error: routineErr } = await supabase
      .from("routines")
      .insert({
        user_id: user.id,
        name: nr.name,
        description: nr.description ?? null,
        day_of_week: nr.day_of_week ?? null,
      })
      .select("id")
      .single();

    if (routineErr || !newRoutine) {
      console.error("[applyAIRoutinePlan] create routine:", routineErr?.message);
      continue;
    }

    stats.created++;

    // Insert exercises for new routine
    for (let i = 0; i < nr.exercises.length; i++) {
      const ex = nr.exercises[i];
      const exerciseId = nameToId.get(ex.exerciseName.toLowerCase());
      if (!exerciseId) {
        stats.unresolved.push(ex.exerciseName);
        continue;
      }
      await supabase.from("routine_exercises").insert({
        routine_id: newRoutine.id,
        exercise_id: exerciseId,
        user_id: user.id,
        order_index: i,
        target_sets: ex.target_sets ?? null,
        target_reps: ex.target_reps ?? null,
        target_weight_kg: ex.target_weight_kg ?? null,
        target_duration_seconds: ex.target_duration_seconds ?? null,
        notes: ex.notes ?? null,
      });
    }
  }

  // 2. Process additions to existing routines
  for (const addition of plan.additions) {
    if (!validRIds.has(addition.routineId)) continue;

    const exerciseId = nameToId.get(addition.exerciseName.toLowerCase());
    if (!exerciseId) {
      stats.unresolved.push(addition.exerciseName);
      continue;
    }

    const { data: maxRow } = await supabase
      .from("routine_exercises")
      .select("order_index")
      .eq("routine_id", addition.routineId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxRow?.order_index ?? -1) + 1;

    const { error } = await supabase.from("routine_exercises").insert({
      routine_id: addition.routineId,
      exercise_id: exerciseId,
      user_id: user.id,
      order_index: nextOrder,
      target_sets: addition.target_sets ?? null,
      target_reps: addition.target_reps ?? null,
      target_weight_kg: addition.target_weight_kg ?? null,
      target_duration_seconds: addition.target_duration_seconds ?? null,
      notes: addition.notes ?? null,
    });

    if (!error) stats.added++;
  }

  // 3. Process modifications to existing routine_exercises
  type RoutineExerciseUpdate = {
    target_sets?: number | null;
    target_reps?: number | null;
    target_weight_kg?: number | null;
    target_duration_seconds?: number | null;
    notes?: string | null;
  };

  for (const mod of plan.modifications) {
    if (!validReIds.has(mod.routineExerciseId)) continue;

    if (mod.kind === "remove") {
      const { error } = await supabase
        .from("routine_exercises")
        .delete()
        .eq("id", mod.routineExerciseId);
      if (!error) stats.removed++;
      continue;
    }

    let updatePayload: RoutineExerciseUpdate | null = null;

    switch (mod.kind) {
      case "increase_weight":
      case "decrease_weight":
        if (mod.proposed.target_weight_kg != null) {
          updatePayload = { target_weight_kg: mod.proposed.target_weight_kg };
        }
        break;
      case "change_reps":
        if (mod.proposed.target_reps != null) {
          updatePayload = { target_reps: mod.proposed.target_reps };
        }
        break;
      case "change_sets":
        if (mod.proposed.target_sets != null) {
          updatePayload = { target_sets: mod.proposed.target_sets };
        }
        break;
      case "add_note":
        if (mod.proposed.notes != null) {
          updatePayload = { notes: mod.proposed.notes };
        }
        break;
    }

    if (!updatePayload) continue;

    const { error } = await supabase
      .from("routine_exercises")
      .update(updatePayload)
      .eq("id", mod.routineExerciseId);

    if (!error) stats.modified++;
  }

  revalidatePath("/rutinas");
  revalidatePath("/coach");

  return { ok: true, stats };
};
