"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { searchUsers, type UserSearchResult } from "@/app/(app)/_actions/users";

type Props = {
  variant?: "icon" | "full";
  className?: string;
};

export const UserSearch = ({ variant = "icon", className }: Props): React.ReactElement => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    startTransition(() => setOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent): void => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onGlobalKey);
    return () => document.removeEventListener("keydown", onGlobalKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const handle = setTimeout(() => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const data = await searchUsers(q);
        setResults(data);
      });
    }, 0);
    return () => clearTimeout(handle);
  }, [query, open]);

  const close = useCallback((): void => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  const trimmed = query.trim();
  const showEmpty = useMemo(
    () => open && trimmed.length >= 2 && !isPending && results.length === 0,
    [open, trimmed, isPending, results.length],
  );

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label="Buscar usuarios"
          onClick={() => setOpen(true)}
          className={`flex items-center justify-center w-8 h-8 rounded-full text-ink-200 hover:text-ink-50 hover:bg-ink-800/40 transition-colors ${className ?? ""}`}
        >
          <SearchIcon />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-md text-[13px] text-ink-300 bg-ink-900/60 hairline hover:text-ink-50 transition-colors ${className ?? ""}`}
        >
          <SearchIcon />
          <span>Buscar usuarios…</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={close}
          aria-modal
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-ink-950 hairline shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/6">
              <span className="text-ink-400">
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre de usuario…"
                className="flex-1 bg-transparent text-[15px] text-ink-50 placeholder:text-ink-500 focus:outline-none"
                aria-label="Buscar usuarios"
              />
              <button
                type="button"
                onClick={close}
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 hover:text-ink-50 transition-colors"
              >
                Esc
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {trimmed.length < 2 && (
                <p className="px-5 py-6 text-[12px] text-ink-500">
                  Escribe al menos 2 caracteres.
                </p>
              )}

              {trimmed.length >= 2 && isPending && results.length === 0 && (
                <p className="px-5 py-6 text-[12px] text-ink-500">Buscando…</p>
              )}

              {showEmpty && (
                <p className="px-5 py-6 text-[12px] text-ink-500">
                  Sin resultados para “{trimmed}”.
                </p>
              )}

              {results.length > 0 && (
                <ul className="py-2">
                  {results.map((u) => (
                    <li key={u.id}>
                      <Link
                        href={`/u/${u.username}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-ink-800/50 transition-colors"
                      >
                        <Avatar url={u.avatar_url} username={u.username} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] text-ink-50 truncate">@{u.username}</span>
                            {!u.is_public && (
                              <span
                                className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-400 border border-white/10 rounded-full px-1.5 py-0.5"
                                title="Perfil privado"
                              >
                                Privado
                              </span>
                            )}
                          </div>
                          {u.full_name && (
                            <p className="text-[12px] text-ink-400 truncate">{u.full_name}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SearchIcon = (): React.ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const Avatar = ({ url, username }: { url: string | null; username: string }): React.ReactElement => {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Avatar de ${username}`} className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" referrerPolicy="no-referrer" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-ink-800 ring-1 ring-white/10 flex items-center justify-center text-[12px] text-ink-300 uppercase">
      {username.slice(0, 2)}
    </div>
  );
};
