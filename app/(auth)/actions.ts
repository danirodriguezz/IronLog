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

export const signInWithGoogleAction = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getOrigin()}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data?.url) {
    return { error: "No hemos podido conectar con Google. Inténtalo de nuevo." };
  }

  redirect(data.url);
};

export const requestPasswordResetAction = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Introduce el email de tu cuenta." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin()}/auth/callback?next=${encodeURIComponent("/update-password")}`,
  });

  if (error) {
    return { error: "No hemos podido enviar el email. Inténtalo de nuevo." };
  }

  return {
    success:
      "Si ese email está registrado, te enviaremos un enlace para restablecer tu contraseña.",
  };
};

export const updatePasswordAction = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "El enlace ha expirado. Solicita uno nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "No hemos podido actualizar la contraseña. Inténtalo de nuevo." };
  }

  redirect("/dashboard");
};
