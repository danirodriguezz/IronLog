"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string } | undefined;

const VALID_GOALS = ["hipertrofia","fuerza","resistencia","perder_grasa","salud_general","rendimiento"] as const;
const VALID_LEVELS = ["beginner","intermediate","advanced"] as const;

export const updateProfileAction = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const weightRaw = String(formData.get("weight_kg") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const isPublic = formData.get("is_public") === "true";

  const primaryGoalRaw = String(formData.get("primary_goal") ?? "").trim();
  const secondaryGoalRaw = String(formData.get("secondary_goal") ?? "").trim();
  const weeklyTargetRaw = String(formData.get("weekly_session_target") ?? "").trim();
  const goalNotes = String(formData.get("goal_notes") ?? "").trim();
  const experienceLevelRaw = String(formData.get("experience_level") ?? "").trim();

  if (!username) return { error: "El nombre de usuario es obligatorio." };
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return {
      error: "El usuario solo puede contener letras minúsculas, números y guiones bajos (3–30 caracteres).",
    };
  }

  let age: number | null = null;
  if (ageRaw !== "") {
    const n = Number(ageRaw);
    if (!Number.isInteger(n) || n <= 0 || n >= 120) {
      return { error: "La edad debe ser un número entre 1 y 119." };
    }
    age = n;
  }

  let weightKg: number | null = null;
  if (weightRaw !== "") {
    const n = Number(weightRaw);
    if (!Number.isFinite(n) || n <= 0) {
      return { error: "El peso debe ser mayor que 0." };
    }
    weightKg = n;
  }

  let weeklyTarget: number | null = null;
  if (weeklyTargetRaw !== "") {
    const n = Number(weeklyTargetRaw);
    if (!Number.isInteger(n) || n < 1 || n > 7) {
      return { error: "El objetivo semanal debe ser entre 1 y 7 sesiones." };
    }
    weeklyTarget = n;
  }

  const primaryGoal = (VALID_GOALS as readonly string[]).includes(primaryGoalRaw) ? primaryGoalRaw : null;
  const secondaryGoal = (VALID_GOALS as readonly string[]).includes(secondaryGoalRaw) ? secondaryGoalRaw : null;
  const experienceLevel = (VALID_LEVELS as readonly string[]).includes(experienceLevelRaw) ? experienceLevelRaw : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };

  const baseUpdate = {
    username,
    full_name: fullName || null,
    age,
    weight_kg: weightKg,
    goal: goal || null,
    is_public: isPublic,
    experience_level: experienceLevel,
  };

  const { error } = await supabase
    .from("profiles")
    .update(
      Object.assign(baseUpdate, {
        primary_goal: primaryGoal,
        secondary_goal: secondaryGoal,
        weekly_session_target: weeklyTarget,
        goal_notes: goalNotes || null,
      }) as typeof baseUpdate,
    )
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese nombre de usuario ya está en uso. Prueba con otro." };
    }
    return { error: "No hemos podido guardar los cambios. Inténtalo de nuevo." };
  }

  revalidatePath("/profile");
  return { success: "Perfil actualizado correctamente." };
};
