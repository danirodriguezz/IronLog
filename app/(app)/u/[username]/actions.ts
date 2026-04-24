"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FollowStatus = "pending" | "accepted";

type FollowResult = { error?: string; status?: FollowStatus };
type SimpleResult = { error?: string };

export const followUserAction = async (
  targetId: string,
  targetUsername: string,
): Promise<FollowResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };
  if (user.id === targetId) return { error: "No puedes seguirte a ti mismo." };

  const { data, error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId })
    .select("status")
    .single();

  if (error) {
    console.error("followUserAction error:", error);
    return { error: "No se pudo completar la acción." };
  }

  revalidatePath(`/u/${targetUsername}`);
  return { status: data.status as FollowStatus };
};

export const unfollowUserAction = async (
  targetId: string,
  targetUsername: string,
): Promise<SimpleResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (error) {
    console.error("unfollowUserAction error:", error);
    return { error: "No se pudo completar la acción." };
  }

  revalidatePath(`/u/${targetUsername}`);
  return {};
};
