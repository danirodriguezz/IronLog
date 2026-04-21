"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string } | undefined;

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      full_name: fullName || null,
      age,
      weight_kg: weightKg,
      goal: goal || null,
      is_public: isPublic,
    })
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
