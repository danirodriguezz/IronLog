"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  showToggle?: boolean;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, className, type = "text", showToggle, id, ...props }, ref) => {
    const auto = useId();
    const inputId = id ?? auto;
    const [reveal, setReveal] = useState(false);
    const effectiveType = showToggle && reveal ? "text" : type;

    return (
      <div className={className}>
        <div className="group relative">
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            placeholder=" "
            className="peer h-14 w-full rounded-[14px] border border-white/10 bg-ink-800/60 px-4 pt-5 pb-1.5 text-[15px] text-ink-50 outline-none transition-all duration-300 placeholder-transparent hover:border-white/20 focus:border-mineral-400/80 focus:bg-ink-800 focus:ring-4 focus:ring-mineral-400/10"
            {...props}
          />
          <label
            htmlFor={inputId}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-ink-200 transition-all duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-focus:top-3 peer-focus:text-[11px] peer-focus:font-mono peer-focus:uppercase peer-focus:tracking-[0.14em] peer-focus:text-mineral-300 peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-mono peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.14em] peer-[:not(:placeholder-shown)]:text-ink-200"
          >
            {label}
          </label>
          {showToggle ? (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-200 hover:text-ink-50 hover:bg-white/5 transition-colors"
            >
              {reveal ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          ) : null}
        </div>
        {hint ? (
          <p className="mt-1.5 pl-1 text-[12px] text-ink-200">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Field.displayName = "Field";
