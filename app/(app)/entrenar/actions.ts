"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string } | undefined;

export type DraftSet = {
  sessionExerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  paceSeconds: number | null;
  rpe: number | null;
};

export const startSessionAction = async (formData: FormData): Promise<void> => {
  const routineId = String(formData.get("routineId") ?? "").trim();
  if (!routineId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    redirect(`/entrenar/${existing.id}`);
  }

  const { data: routine } = await supabase
    .from("routines")
    .select("id, name, routine_exercises(id, exercise_id, order_index)")
    .eq("id", routineId)
    .maybeSingle();

  if (!routine) return;

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      routine_id: routine.id,
      name: routine.name,
      status: "active",
    })
    .select("id")
    .single();

  if (sErr || !session) return;

  const items = (routine.routine_exercises ?? []) as {
    id: string;
    exercise_id: string;
    order_index: number;
  }[];

  if (items.length > 0) {
    await supabase.from("session_exercises").insert(
      items
        .sort((a, b) => a.order_index - b.order_index)
        .map((r) => ({
          session_id: session.id,
          exercise_id: r.exercise_id,
          user_id: user.id,
          order_index: r.order_index,
        })),
    );
  }

  revalidatePath("/entrenar");
  redirect(`/entrenar/${session.id}`);
};

const replaceSets = async (
  sessionId: string,
  userId: string,
  sets: DraftSet[],
): Promise<string | null> => {
  const supabase = await createClient();

  const { data: ownership } = await supabase
    .from("sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!ownership || ownership.user_id !== userId) {
    return "Sesión no encontrada.";
  }
  if (ownership.status === "discarded") {
    return "Esta sesión fue descartada.";
  }

  const { error: delErr } = await supabase
    .from("sets")
    .delete()
    .eq("user_id", userId)
    .in(
      "session_exercise_id",
      sets.length > 0 ? sets.map((s) => s.sessionExerciseId) : ["00000000-0000-0000-0000-000000000000"],
    );

  if (delErr) return "No hemos podido guardar los cambios.";

  const rows = sets
    .filter(
      (s) =>
        s.reps !== null ||
        s.durationSeconds !== null ||
        s.distanceMeters !== null ||
        s.paceSeconds !== null,
    )
    .map((s) => ({
      session_exercise_id: s.sessionExerciseId,
      user_id: userId,
      set_number: s.setNumber,
      reps: s.reps,
      weight_kg: s.weightKg,
      duration_seconds: s.durationSeconds,
      distance_meters: s.distanceMeters,
      pace_seconds: s.paceSeconds,
      rpe: s.rpe,
    }));

  if (rows.length > 0) {
    // exercise_id is NOT NULL in the schema but filled by a BEFORE INSERT trigger from session_exercises
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await supabase.from("sets").insert(rows as any);
    if (insErr) return "No hemos podido guardar los sets.";
  }
  return null;
};

export const saveDraftAction = async (
  sessionId: string,
  sets: DraftSet[],
): Promise<ActionState> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha expirado." };

  const err = await replaceSets(sessionId, user.id, sets);
  if (err) return { error: err };

  revalidatePath(`/entrenar/${sessionId}`);
  return { success: "Borrador guardado." };
};

export const finishSessionAction = async (
  sessionId: string,
  sets: DraftSet[],
  endedAt?: string | null,
): Promise<ActionState> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha expirado." };

  const err = await replaceSets(sessionId, user.id, sets);
  if (err) return { error: err };

  const { error: updErr } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      ended_at: endedAt !== undefined ? endedAt : new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (updErr) return { error: "No hemos podido cerrar el entreno." };

  revalidatePath("/entrenar");
  return { success: "Entreno guardado." };
};

export const logPastSessionAction = async (formData: FormData): Promise<void> => {
  const routineId = String(formData.get("routineId") ?? "").trim();
  const sessionDate = String(formData.get("sessionDate") ?? "").trim();
  if (!routineId || !sessionDate) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    redirect(`/entrenar/${existing.id}`);
  }

  const { data: routine } = await supabase
    .from("routines")
    .select("id, name, routine_exercises(id, exercise_id, order_index)")
    .eq("id", routineId)
    .maybeSingle();

  if (!routine) return;

  const startedAt = `${sessionDate}T12:00:00.000Z`;

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      routine_id: routine.id,
      name: routine.name,
      status: "active",
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (sErr || !session) return;

  const items = (routine.routine_exercises ?? []) as {
    id: string;
    exercise_id: string;
    order_index: number;
  }[];

  if (items.length > 0) {
    await supabase.from("session_exercises").insert(
      items
        .sort((a, b) => a.order_index - b.order_index)
        .map((r) => ({
          session_id: session.id,
          exercise_id: r.exercise_id,
          user_id: user.id,
          order_index: r.order_index,
        })),
    );
  }

  revalidatePath("/entrenar");
  redirect(`/entrenar/${session.id}`);
};

export const saveCompletedEditAction = async (
  sessionId: string,
  sets: DraftSet[],
  endedAt?: string | null,
): Promise<ActionState> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha expirado." };

  const err = await replaceSets(sessionId, user.id, sets);
  if (err) return { error: err };

  if (endedAt !== undefined) {
    await supabase
      .from("sessions")
      .update({ ended_at: endedAt })
      .eq("id", sessionId)
      .eq("user_id", user.id);
  }

  revalidatePath(`/entrenar/historial/${sessionId}`);
  revalidatePath("/entrenar");
  return { success: "Cambios guardados." };
};

export const discardSessionAction = async (formData: FormData): Promise<void> => {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "active");

  revalidatePath("/entrenar");
  redirect("/entrenar");
};
