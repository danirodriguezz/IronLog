"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptRequestAction, rejectRequestAction } from "../actions";

type Props = {
  followerId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  createdAt: string;
};

type Resolved = "accepted" | "rejected" | null;

export const RequestRow = ({
  followerId,
  username,
  fullName,
  avatarUrl,
  isPublic,
  createdAt,
}: Props): React.ReactElement | null => {
  const [resolved, setResolved] = useState<Resolved>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAccept = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await acceptRequestAction(followerId);
      if (res.error) setError(res.error);
      else setResolved("accepted");
    });
  };

  const handleReject = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await rejectRequestAction(followerId);
      if (res.error) setError(res.error);
      else setResolved("rejected");
    });
  };

  if (resolved) {
    return (
      <li className="hairline rounded-2xl bg-ink-900/30 px-4 py-3 flex items-center gap-3">
        <Avatar url={avatarUrl} username={username} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
            {resolved === "accepted" ? "Aceptada" : "Rechazada"}
          </p>
          <p className="text-[14px] text-ink-300 truncate">@{username}</p>
        </div>
      </li>
    );
  }

  return (
    <li className="hairline rounded-2xl bg-ink-900/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <Link href={`/u/${username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
        <Avatar url={avatarUrl} username={username} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-ink-50 truncate group-hover:text-white transition-colors">
              @{username}
            </span>
            {!isPublic && (
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-400 border border-white/10 rounded-full px-1.5 py-0.5">
                Privado
              </span>
            )}
          </div>
          {fullName && <p className="text-[12px] text-ink-400 truncate">{fullName}</p>}
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500 tabular-nums">
            {formatRelative(createdAt)}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
          className="inline-flex items-center rounded-full bg-mineral-700/25 text-mineral-300 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] ring-1 ring-mineral-700/40 transition-colors hover:bg-mineral-700/40 disabled:opacity-60"
        >
          Aceptar
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="inline-flex items-center rounded-full bg-ink-800/80 text-ink-200 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] ring-1 ring-white/10 transition-colors hover:bg-ember-500/15 hover:text-ember-400 hover:ring-ember-500/30 disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>

      {error && (
        <span role="alert" className="font-mono text-[10px] uppercase tracking-[0.22em] text-ember-400 w-full">
          {error}
        </span>
      )}
    </li>
  );
};

const formatRelative = (iso: string): string => {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Hace ${diffD}d`;
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(date);
};

const Avatar = ({ url, username }: { url: string | null; username: string }): React.ReactElement => {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-ink-800 ring-1 ring-white/10 flex items-center justify-center text-[12px] text-ink-300 uppercase shrink-0">
      {username.slice(0, 2)}
    </div>
  );
};
