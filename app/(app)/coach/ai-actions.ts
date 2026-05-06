"use server";

import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const groq = createGroq();

// ── Types ────────────────────────────────────────────────────────────────────

export type AIUserProfile = {
  primary_goal: string | null;
  secondary_goal: string | null;
  goal: string | null;
  goal_notes: string | null;
  experience_level: string | null;
  weekly_session_target: number | null;
  weight_kg: number | null;
  age: number | null;
};

export type AISession = {
  id: string;
  name: string | null;
  routine_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type AIRoutineExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string | null;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_duration_seconds: number | null;
};

export type AIRoutine = {
  id: string;
  name: string;
  description: string | null;
  day_of_week: number | null;
  exercises: AIRoutineExercise[];
};

export type AIPrSet = {
  exercise_name: string;
  exercise_type: string;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  created_at: string;
};

export type UserContextForAI = {
  profile: AIUserProfile;
  recentSessions: AISession[];
  weeklyVolume: { date: string; volume_kg: number }[];
  routines: AIRoutine[];
  recentPrs: AIPrSet[];
};

// ── Fetch context ─────────────────────────────────────────────────────────────

export const fetchUserContextForAI = async (): Promise<UserContextForAI | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [profileResult, sessionsResult, routinesResult, volumeResult, prsResult] =
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("profiles")
        .select(
          "primary_goal, secondary_goal, goal, goal_notes, experience_level, weekly_session_target, weight_kg, age",
        )
        .eq("id", user.id)
        .single(),

      supabase
        .from("sessions")
        .select("id, name, routine_id, started_at, ended_at, created_at")
        .eq("user_id", user.id)
        .gte("created_at", fourteenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20),

      supabase
        .from("routines")
        .select(
          `id, name, description, day_of_week,
          routine_exercises (
            id,
            exercise_id,
            target_sets,
            target_reps,
            target_weight_kg,
            target_duration_seconds,
            exercises ( name )
          )`,
        )
        .eq("user_id", user.id)
        .order("day_of_week", { ascending: true, nullsFirst: false }),

      supabase
        .from("sets")
        .select("weight_kg, reps, created_at, exercises!inner(type)")
        .eq("exercises.type", "strength")
        .eq("user_id", user.id)
        .gte("created_at", fourteenDaysAgo),

      supabase
        .from("sets")
        .select(
          "weight_kg, reps, duration_seconds, distance_meters, created_at, exercises!inner(name, type)",
        )
        .eq("is_pr", true)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (profileResult.error) {
    console.error("[fetchUserContextForAI] profile:", profileResult.error.message);
    return null;
  }

  // Aggregate daily volume from raw sets
  const volumeByDay = new Map<string, number>();
  for (const s of volumeResult.data ?? []) {
    const day = s.created_at.slice(0, 10);
    volumeByDay.set(day, (volumeByDay.get(day) ?? 0) + (Number(s.weight_kg) || 0) * (s.reps ?? 0));
  }
  const weeklyVolume = Array.from(volumeByDay.entries())
    .map(([date, volume_kg]) => ({ date, volume_kg: Math.round(volume_kg) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const routines: AIRoutine[] = (routinesResult.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    day_of_week: r.day_of_week,
    exercises: (r.routine_exercises ?? []).map((re) => ({
      id: re.id,
      exercise_id: re.exercise_id,
      exercise_name: (re.exercises as { name: string } | null)?.name ?? null,
      target_sets: re.target_sets,
      target_reps: re.target_reps,
      target_weight_kg: re.target_weight_kg,
      target_duration_seconds: re.target_duration_seconds,
    })),
  }));

  const recentPrs: AIPrSet[] = (prsResult.data ?? []).map((s) => ({
    exercise_name: (s.exercises as { name: string; type: string } | null)?.name ?? "Desconocido",
    exercise_type: (s.exercises as { name: string; type: string } | null)?.type ?? "strength",
    weight_kg: s.weight_kg,
    reps: s.reps,
    duration_seconds: s.duration_seconds,
    distance_meters: s.distance_meters,
    created_at: s.created_at,
  }));

  return {
    profile: profileResult.data as AIUserProfile,
    recentSessions: sessionsResult.data ?? [],
    weeklyVolume,
    routines,
    recentPrs,
  };
};

// ── Schema ────────────────────────────────────────────────────────────────────

const weekDayPlanSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  routineId: z.string().nullable(),
  routineName: z.string().nullable(),
  focus: z.string().nullable(),
  advice: z.string().nullable(),
});

const routineRecommendationSchema = z.object({
  routineExerciseId: z.string(),
  routineId: z.string(),
  exerciseName: z.string(),
  kind: z.enum([
    "increase_weight",
    "decrease_weight",
    "change_reps",
    "change_sets",
    "replace_exercise",
    "remove",
    "add_note",
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

const feedbackSchema = z.object({
  motivationalMessage: z.string(),
  adherenceScore: z.number().int().min(1).max(10),
  adherenceAnalysis: z.string(),
  volumeAnalysis: z.string(),
  weekPlan: z.array(weekDayPlanSchema),
  routineRecommendations: z.array(routineRecommendationSchema),
  overallReport: z.string(),
});

export type WeeklyFeedback = z.infer<typeof feedbackSchema>;

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedInsight = {
  id: string;
  feedback: WeeklyFeedback;
  created_at: string;
  applied_recommendations: number[];
  isStale: boolean;
};

export type FeedbackResult =
  | { ok: true; insight: CachedInsight }
  | { ok: false; reason: "unauthenticated" | "incomplete_profile" | "insufficient_data" | "error" };

export const getCachedFeedback = async (): Promise<CachedInsight | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("ai_insights")
    .select("id, feedback, created_at, applied_recommendations")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { id: string; feedback: unknown; created_at: string; applied_recommendations: number[] | null } | null };

  if (!data) return null;

  return {
    id: data.id,
    feedback: data.feedback as WeeklyFeedback,
    created_at: data.created_at,
    applied_recommendations: (data.applied_recommendations ?? []) as number[],
    isStale: Date.now() - new Date(data.created_at).getTime() >= CACHE_TTL_MS,
  };
};

// ── Generate ──────────────────────────────────────────────────────────────────

export const generateWeeklyFeedback = async (): Promise<FeedbackResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // Check cache first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cached } = await (supabase as any)
    .from("ai_insights")
    .select("id, feedback, created_at, applied_recommendations")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { id: string; feedback: unknown; created_at: string; applied_recommendations: number[] | null } | null };

  if (cached) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime();
    if (ageMs < CACHE_TTL_MS) {
      return {
        ok: true,
        insight: {
          id: cached.id,
          feedback: cached.feedback as WeeklyFeedback,
          created_at: cached.created_at,
          applied_recommendations: (cached.applied_recommendations ?? []) as number[],
          isStale: false,
        },
      };
    }
  }

  const context = await fetchUserContextForAI();
  if (!context) return { ok: false, reason: "error" };

  const { profile, recentSessions, weeklyVolume, routines, recentPrs } = context;

  if (!profile.age || !profile.weight_kg || (!profile.primary_goal && !profile.goal)) {
    return { ok: false, reason: "incomplete_profile" };
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const hasWeekOfData = recentSessions.some(
    (s) => new Date(s.created_at).getTime() >= sevenDaysAgo,
  );
  if (!hasWeekOfData) {
    return { ok: false, reason: "insufficient_data" };
  }

  const routinesSummary = routines
    .map((r) => {
      const dayLabel = r.day_of_week ? ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][r.day_of_week - 1] : "Sin día";
      const exList = r.exercises
        .map(
          (e) =>
            `    • ${e.exercise_name ?? e.exercise_id} [id:${e.id}] — ${e.target_sets ?? "?"}×${e.target_reps ?? "?"} @ ${e.target_weight_kg ?? "?"}kg`,
        )
        .join("\n");
      return `[${dayLabel}] ${r.name} (routine_id:${r.id})\n${exList || "    Sin ejercicios"}`;
    })
    .join("\n\n");

  const sessionsSummary =
    recentSessions.length > 0
      ? recentSessions
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
            return `- ${p.exercise_name}: ${val} (${new Date(p.created_at).toLocaleDateString("es-ES")})`;
          })
          .join("\n")
      : "Sin PRs recientes.";

  const today = new Date();
  const jsDay = today.getDay();
  const isoToday = jsDay === 0 ? 7 : jsDay;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (isoToday - 1));
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
  });

  const systemPrompt = `Eres un entrenador personal de élite que revisa el progreso de tu atleta UNA VEZ A LA SEMANA. \
Eres empático pero directo. Tu análisis debe basarse exclusivamente en los datos reales que te proporciono — no inventes datos.

PERFIL:
- Objetivo principal: ${profile.primary_goal ?? profile.goal ?? "no especificado"}
- Objetivo secundario: ${profile.secondary_goal ?? "ninguno"}
- Nivel: ${profile.experience_level ?? "no especificado"}
- Peso corporal: ${profile.weight_kg} kg
- Edad: ${profile.age} años
- Sesiones objetivo/semana: ${profile.weekly_session_target ?? "no especificado"}
- Notas del usuario: ${profile.goal_notes ?? "ninguna"}

RUTINAS (con IDs exactos para recomendaciones):
${routinesSummary || "Sin rutinas creadas."}

SESIONES ÚLTIMOS 14 DÍAS:
${sessionsSummary}

VOLUMEN DE FUERZA POR DÍA (últimos 14 días):
${volumeSummary}

PRs RECIENTES:
${prsSummary}

SEMANA ACTUAL (para tu plan):
${weekDates.map((d, i) => `Día ${i + 1}: ${d}`).join("\n")}

INSTRUCCIONES OBLIGATORIAS PARA EL JSON:
1. motivationalMessage: Un mensaje corto, enérgico y motivador para el atleta al empezar la semana.
2. adherenceScore: Número del 1 al 10. Compara las sesiones realizadas con las sesiones objetivo.
3. adherenceAnalysis: Breve análisis explicando el porqué de la puntuación de adherencia.
4. volumeAnalysis: Breve análisis del volumen de fuerza acumulado (ej. si ha sido constante, si ha subido o bajado).
5. weekPlan: Planifica los 7 días de la semana actual. Asigna routineId y routineName cuando hay rutina, y usa null cuando es descanso.
6. routineRecommendations: Recomienda cambios SOLO con evidencia clara (estancamiento, sobrecarga). Usa EXACTAMENTE los IDs dados. 
   IMPORTANTE: El campo 'kind' DEBE ser exactamente uno de: "increase_weight", "decrease_weight", "change_reps", "change_sets", "replace_exercise", "remove", "add_note".
7. overallReport: Párrafo de 3-5 frases como entrenador: qué está bien, en qué centrarse y feedback general.
8. Responde SIEMPRE en español y asegúrate de incluir ABSOLUTAMENTE TODOS los campos solicitados en el esquema JSON.`;

  let feedback: WeeklyFeedback;
  try {
    const result = await generateObject({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      schema: feedbackSchema,
      system: systemPrompt,
      prompt: "Genera el informe semanal de entrenamiento para este atleta.",
    });
    feedback = result.object;
  } catch (err) {
    console.error("[generateWeeklyFeedback] model error:", err);
    return { ok: false, reason: "error" };
  }

  // Validate that routineExerciseIds belong to this user's routines
  const validReIds = new Set(routines.flatMap((r) => r.exercises.map((e) => e.id)));
  const validRIds = new Set(routines.map((r) => r.id));
  feedback.routineRecommendations = feedback.routineRecommendations.filter(
    (rec) => validReIds.has(rec.routineExerciseId) && validRIds.has(rec.routineId),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase as any)
    .from("ai_insights")
    .insert({ user_id: user.id, feedback, applied_recommendations: [] })
    .select("id, created_at")
    .single() as { data: { id: string; created_at: string } | null; error: { message: string } | null };

  if (insertError || !inserted) {
    console.error("[generateWeeklyFeedback] insert:", insertError?.message);
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    insight: {
      id: inserted.id,
      feedback,
      created_at: inserted.created_at,
      applied_recommendations: [],
      isStale: false,
    },
  };
};

// ── Apply recommendation ──────────────────────────────────────────────────────

export type ApplyResult =
  | { ok: true }
  | { ok: false; reason: string };

export const applyRoutineRecommendation = async (
  insightId: string,
  recommendationIndex: number,
): Promise<ApplyResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // RLS ensures this insight belongs to the user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insightData, error: fetchError } = await (supabase as any)
    .from("ai_insights")
    .select("id, feedback, applied_recommendations")
    .eq("id", insightId)
    .eq("user_id", user.id)
    .single() as { data: { id: string; feedback: unknown; applied_recommendations: number[] | null } | null; error: unknown };

  if (fetchError || !insightData) return { ok: false, reason: "insight_not_found" };

  const feedback = insightData.feedback as WeeklyFeedback;
  const applied = (insightData.applied_recommendations ?? []) as number[];

  if (applied.includes(recommendationIndex)) return { ok: false, reason: "already_applied" };

  const rec = feedback.routineRecommendations[recommendationIndex];
  if (!rec) return { ok: false, reason: "invalid_index" };

  // Verify ownership of routine_exercise
  const { data: reData, error: reError } = await supabase
    .from("routine_exercises")
    .select("id, routine_id")
    .eq("id", rec.routineExerciseId)
    .eq("routine_id", rec.routineId)
    .single();

  if (reError || !reData) return { ok: false, reason: "exercise_not_found" };

  // Build the update payload based on recommendation kind
  type RoutineExerciseUpdate = {
    target_sets?: number;
    target_reps?: number;
    target_weight_kg?: number;
    target_duration_seconds?: number;
    notes?: string;
  };

  let updatePayload: RoutineExerciseUpdate | null = null;

  switch (rec.kind) {
    case "increase_weight":
    case "decrease_weight":
      if (rec.proposed.target_weight_kg != null) {
        updatePayload = { target_weight_kg: rec.proposed.target_weight_kg };
      }
      break;
    case "change_reps":
      if (rec.proposed.target_reps != null) {
        updatePayload = { target_reps: rec.proposed.target_reps };
      }
      break;
    case "change_sets":
      if (rec.proposed.target_sets != null) {
        updatePayload = { target_sets: rec.proposed.target_sets };
      }
      break;
    case "add_note":
      if (rec.proposed.notes != null) {
        updatePayload = { notes: rec.proposed.notes };
      }
      break;
    case "replace_exercise":
    case "remove":
      // These require more complex operations — mark as applied but don't auto-modify
      break;
  }

  if (updatePayload) {
    const { error: updateError } = await supabase
      .from("routine_exercises")
      .update(updatePayload)
      .eq("id", rec.routineExerciseId);

    if (updateError) {
      console.error("[applyRoutineRecommendation] update:", updateError.message);
      return { ok: false, reason: "update_failed" };
    }
  }

  // Mark as applied
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: markError } = await (supabase as any)
    .from("ai_insights")
    .update({ applied_recommendations: [...applied, recommendationIndex] })
    .eq("id", insightId);

  if (markError) {
    console.error("[applyRoutineRecommendation] mark:", markError.message);
  }

  revalidatePath("/coach");
  revalidatePath("/rutinas");

  return { ok: true };
};
