"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dismissToast, subscribeToasts, type Toast } from "./toast-store";

export const ToastContainer = (): React.ReactElement => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map((t) => {
        const tone =
          t.variant === "success"
            ? "bg-mineral-700/25 text-mineral-200 ring-mineral-700/40"
            : "bg-ink-900/90 text-ink-100 ring-white/10";

        const body = (
          <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 backdrop-blur-xl shadow-2xl ${tone}`}>
            <span className="flex-1 text-[13px] leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Descartar"
              className="shrink-0 text-ink-400 hover:text-ink-50 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <line x1="1" y1="1" x2="13" y2="13" />
                <line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>
          </div>
        );

        return (
          <div key={t.id} className="pointer-events-auto animate-[fade-in_0.2s_ease-out]">
            {t.href ? (
              <Link href={t.href} onClick={() => dismissToast(t.id)}>
                {body}
              </Link>
            ) : (
              body
            )}
          </div>
        );
      })}
    </div>
  );
};
