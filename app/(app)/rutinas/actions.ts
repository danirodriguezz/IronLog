"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string } | undefined;

export const createRoutineAction = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    return { error: "Pon un nombre a tu rutina." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const { data, error } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name,
      description: description || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "No hemos podido crear la rutina. Inténtalo de nuevo." };
  }

  revalidatePath("/rutinas");
  redirect(`/rutinas/${data.id}`);
};

export const deleteRoutineAction = async (formData: FormData): Promise<void> => {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("routines").delete().eq("id", id);

  revalidatePath("/rutinas");
  redirect("/rutinas");
};

export const addRoutineExerciseAction = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const routineId = String(formData.get("routineId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const targetSets = formData.get("targetSets");
  const targetReps = formData.get("targetReps");
  const targetWeight = formData.get("targetWeight");
  const targetDuration = formData.get("targetDuration");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!routineId || !exerciseId) {
    return { error: "Selecciona un ejercicio." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha expirado." };
  }

  const { data: maxRow } = await supabase
    .from("routine_exercises")
    .select("order_index")
    .eq("routine_id", routineId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.order_index ?? -1) + 1;

  const toInt = (v: FormDataEntryValue | null): number | null => {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  };
  const toNum = (v: FormDataEntryValue | null): number | null => {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const { error } = await supabase.from("routine_exercises").insert({
    routine_id: routineId,
    exercise_id: exerciseId,
    user_id: user.id,
    order_index: nextOrder,
    target_sets: toInt(targetSets),
    target_reps: toInt(targetReps),
    target_weight_kg: toNum(targetWeight),
    target_duration_seconds: toInt(targetDuration),
    notes: notes || null,
  });

  if (error) {
    return { error: "No hemos podido añadir el ejercicio." };
  }

  revalidatePath(`/rutinas/${routineId}`);
  return { success: "Ejercicio añadido." };
};

export const removeRoutineExerciseAction = async (formData: FormData): Promise<void> => {
  const id = String(formData.get("id") ?? "");
  const routineId = String(formData.get("routineId") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("routine_exercises").delete().eq("id", id);

  if (routineId) revalidatePath(`/rutinas/${routineId}`);
};
