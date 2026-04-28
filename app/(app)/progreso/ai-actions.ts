"use server";

import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const groq = createGroq();

export type AIUserProfile = {
  goal: string | null;
  experience_level: string | null;
  weight_kg: number | null;
  age: number | null;
};

export type AISession = {
  id: string;
  name: string | null;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type AIRoutine = {
  id: string;
  name: string;
  description: string | null;
  day_of_week: number | null;
  exercises: {
    exercise_id: string;
    exercise_name: string | null;
    target_sets: number | null;
    target_reps: number | null;
    target_weight_kg: number | null;
    target_duration_seconds: number | null;
  }[];
};

export type UserContextForAI = {
  profile: AIUserProfile;
  recentSessions: AISession[];
  routines: AIRoutine[];
};

export const fetchUserContextForAI = async (): Promise<UserContextForAI | null> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, sessionsResult, routinesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("goal, experience_level, weight_kg, age")
      .eq("id", user.id)
      .single(),

    supabase
      .from("sessions")
      .select("id, name, status, started_at, ended_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("routines")
      .select(`
        id,
        name,
        description,
        day_of_week,
        routine_exercises (
          exercise_id,
          target_sets,
          target_reps,
          target_weight_kg,
          target_duration_seconds,
          exercises ( name )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) {
    console.error("[fetchUserContextForAI] profile:", profileResult.error.message);
    return null;
  }
  if (sessionsResult.error) {
    console.error("[fetchUserContextForAI] sessions:", sessionsResult.error.message);
  }
  if (routinesResult.error) {
    console.error("[fetchUserContextForAI] routines:", routinesResult.error.message);
  }

  const routines: AIRoutine[] = (routinesResult.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    day_of_week: r.day_of_week,
    exercises: (r.routine_exercises ?? []).map((re) => ({
      exercise_id: re.exercise_id,
      exercise_name: (re.exercises as { name: string } | null)?.name ?? null,
      target_sets: re.target_sets,
      target_reps: re.target_reps,
      target_weight_kg: re.target_weight_kg,
      target_duration_seconds: re.target_duration_seconds,
    })),
  }));

  return {
    profile: profileResult.data,
    recentSessions: sessionsResult.data ?? [],
    routines,
  };
};

const feedbackSchema = z.object({
  motivationalMessage: z.string().describe("Saludo corto y directo al usuario, empático pero motivador."),
  volumeAnalysis: z.string().describe("Análisis breve de volumen y consistencia basado en las últimas sesiones."),
  nextSessionAdvice: z.string().describe("Consejo técnico concreto de progresión para el próximo entrenamiento."),
  adherenceScore: z.number().int().min(1).max(10).describe("Puntuación de consistencia del 1 al 10. Si no hay sesiones registradas, usa 1 (nunca 0)."),
});

export type WeeklyFeedback = z.infer<typeof feedbackSchema>;

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos

export type FeedbackResult =
  | { ok: true; feedback: WeeklyFeedback }
  | { ok: false; reason: "unauthenticated" | "incomplete_profile" | "error" };

export const generateWeeklyFeedback = async (): Promise<FeedbackResult> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // Comprobar caché: si hay un insight de menos de 7 días, devolverlo sin llamar a la IA
  const { data: cached } = await supabase
    .from("ai_insights")
    .select("feedback, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime();
    if (ageMs < CACHE_TTL_MS) {
      return { ok: true, feedback: cached.feedback as WeeklyFeedback };
    }
  }

  const context = await fetchUserContextForAI();
  if (!context) return { ok: false, reason: "error" };

  const { profile, recentSessions, routines } = context;

  if (!profile.age || !profile.weight_kg || !profile.goal) {
    return { ok: false, reason: "incomplete_profile" };
  }

  const routinesSummary = routines.map((r) => {
    const exList = r.exercises
      .map((e) => e.exercise_name ?? e.exercise_id)
      .join(", ");
    return `- ${r.name}: ${exList || "sin ejercicios"}`;
  }).join("\n");

  const sessionsSummary = recentSessions.length > 0
    ? recentSessions.map((s) => {
        const date = new Date(s.created_at).toLocaleDateString("es-ES");
        return `- ${date}: "${s.name ?? "Sin nombre"}" (estado: ${s.status ?? "desconocido"})`;
      }).join("\n")
    : "El usuario no ha registrado sesiones todavía.";

  const systemPrompt = `Eres un entrenador de fuerza de élite, empático pero directo. \
Tu misión es analizar los datos de entrenamiento del usuario y darle un feedback semanal \
accionable, centrado en progresión y prevención de sobreentrenamiento.

PERFIL DEL USUARIO:
- Objetivo: ${profile.goal ?? "no especificado"}
- Nivel: ${profile.experience_level ?? "no especificado"}
- Peso corporal: ${profile.weight_kg != null ? `${profile.weight_kg} kg` : "no especificado"}
- Edad: ${profile.age != null ? `${profile.age} años` : "no especificada"}

RUTINAS ACTUALES:
${routinesSummary || "El usuario no tiene rutinas creadas."}

ÚLTIMAS 5 SESIONES:
${sessionsSummary}

Responde siempre en español. Sé conciso, directo y práctico. No inventes datos que no estén aquí.
IMPORTANTE: adherenceScore debe ser un entero entre 1 y 10. Si no hay sesiones registradas, asigna 1.`;

  const { output: feedback } = await generateText({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    output: Output.object({ schema: feedbackSchema }),
    system: systemPrompt,
    prompt: "Genera el análisis semanal de entrenamiento para este usuario.",
  });

  const { error: insertError } = await supabase
    .from("ai_insights")
    .insert({ user_id: user.id, feedback });

  if (insertError) {
    console.error("[generateWeeklyFeedback] insert:", insertError.message);
  }

  return { ok: true, feedback };
};
