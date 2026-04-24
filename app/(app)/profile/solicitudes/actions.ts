"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

export const acceptRequestAction = async (followerId: string): Promise<Result> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("acceptRequestAction error:", error);
    return { error: "No se pudo aceptar la solicitud." };
  }

  revalidatePath("/profile/solicitudes");
  revalidatePath("/profile");
  return {};
};

export const rejectRequestAction = async (followerId: string): Promise<Result> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("rejectRequestAction error:", error);
    return { error: "No se pudo rechazar la solicitud." };
  }

  revalidatePath("/profile/solicitudes");
  revalidatePath("/profile");
  return {};
};
