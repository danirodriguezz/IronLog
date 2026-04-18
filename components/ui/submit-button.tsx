"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
};

export const SubmitButton = ({ children, pendingLabel = "Un momento…" }: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative h-12 w-full overflow-hidden rounded-[14px] bg-ink-50 text-ink-950 font-medium tracking-tight transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out"
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {pending ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {pendingLabel}
          </>
        ) : (
          <>
            {children}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5">
              <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </span>
    </button>
  );
};
