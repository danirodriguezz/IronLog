"use client";

import { useState, useTransition } from "react";
import { followUserAction, unfollowUserAction } from "../actions";

type Status = "none" | "pending" | "accepted";

type Props = {
  targetId: string;
  targetUsername: string;
  isPublicProfile: boolean;
  initialStatus: Status;
};

export const FollowButton = ({
  targetId,
  targetUsername,
  isPublicProfile,
  initialStatus,
}: Props): React.ReactElement => {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [hovering, setHovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFollow = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await followUserAction(targetId, targetUsername);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.status) setStatus(res.status);
    });
  };

  const handleUnfollow = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await unfollowUserAction(targetId, targetUsername);
      if (res.error) {
        setError(res.error);
        return;
      }
      setStatus("none");
      setHovering(false);
    });
  };

  const baseBtn =
    "inline-flex w-full justify-center items-center rounded-full font-mono text-[11px] uppercase tracking-[0.2em] px-4 py-2 sm:w-auto sm:py-1.5 transition-colors disabled:opacity-60";

  return (
    <div className="flex flex-col gap-1">
      {status === "none" && (
        <button
          type="button"
          onClick={handleFollow}
          disabled={isPending}
          className={`${baseBtn} bg-ink-50 text-ink-950 ring-1 ring-white/10 hover:opacity-90`}
        >
          {isPending ? "…" : isPublicProfile ? "Seguir" : "Solicitar seguir"}
        </button>
      )}

      {status === "pending" && (
        <button
          type="button"
          onClick={handleUnfollow}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          disabled={isPending}
          className={`${baseBtn} bg-ink-800/80 text-ink-200 ring-1 ring-white/10 hover:bg-ember-500/15 hover:text-ember-400 hover:ring-ember-500/30`}
        >
          {isPending ? "…" : hovering ? "Cancelar solicitud" : "Solicitud enviada"}
        </button>
      )}

      {status === "accepted" && (
        <button
          type="button"
          onClick={handleUnfollow}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          disabled={isPending}
          className={`${baseBtn} bg-mineral-700/25 text-mineral-300 ring-1 ring-mineral-700/40 hover:bg-ember-500/15 hover:text-ember-400 hover:ring-ember-500/30`}
        >
          {isPending ? "…" : hovering ? "Dejar de seguir" : "Siguiendo"}
        </button>
      )}

      {error && (
        <span role="alert" className="font-mono text-[10px] uppercase tracking-[0.22em] text-ember-400 text-center sm:text-right">
          {error}
        </span>
      )}
    </div>
  );
};
