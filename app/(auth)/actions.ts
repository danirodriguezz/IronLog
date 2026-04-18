"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string } | undefined;

const getOrigin = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const signInAction = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Introduce tu email y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales incorrectas. Prueba de nuevo." };
  }

  redirect(redirectTo);
};

export const signUpAction = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) {
    return { error: "Introduce tu email y una contraseña." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name || null },
      emailRedirectTo: `${getOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "Te hemos enviado un email de confirmación. Revisa tu bandeja para activar la cuenta.",
  };
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
};
