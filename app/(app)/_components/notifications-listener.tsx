"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { pushToast } from "./toast-store";

type FollowRow = {
  follower_id: string;
  following_id: string;
  status: "pending" | "accepted";
};

export const NotificationsListener = ({
  currentUserId,
}: {
  currentUserId: string;
}): React.ReactElement | null => {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const setup = async (): Promise<(() => void) | undefined> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("[RT] no session — realtime subscription skipped");
        return;
      }

      // Force realtime to use the current user's JWT. supabase-js usually
      // syncs this automatically, but explicit is safer and cheap.
      supabase.realtime.setAuth(session.access_token);
      console.log("[RT] setAuth done for user", currentUserId);

      const channel = supabase
        .channel(`follows-to-${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "follows",
            filter: `following_id=eq.${currentUserId}`,
          },
          async (payload) => {
            console.log("[RT] INSERT payload:", payload);
            const row = payload.new as FollowRow;

            const { data } = await supabase.rpc("get_profile_by_id", { uid: row.follower_id });
            const profile = (data?.[0] ?? null) as {
              username: string;
              full_name: string | null;
              avatar_url: string | null;
            } | null;
            const who = profile?.username ? `@${profile.username}` : "Alguien";

            if (row.status === "pending") {
              pushToast({
                message: `${who} te ha enviado una solicitud de seguimiento.`,
                href: "/profile/solicitudes",
              });
            } else {
              pushToast({
                message: `${who} ha empezado a seguirte.`,
                href: profile?.username ? `/u/${profile.username}` : undefined,
                variant: "success",
              });
            }

            router.refresh();
          },
        )
        .subscribe((status, err) => {
          console.log("[RT] subscribe status:", status, err ?? "");
        });

      if (!active) {
        supabase.removeChannel(channel);
        return;
      }

      return () => {
        console.log("[RT] removing channel");
        supabase.removeChannel(channel);
      };
    };

    const cleanupPromise = setup();

    return () => {
      active = false;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [currentUserId, router]);

  return null;
};
