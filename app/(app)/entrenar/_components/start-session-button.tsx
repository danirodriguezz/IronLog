"use client";

import { useFormStatus } from "react-dom";
import { startSessionAction } from "../actions";

type Props = {
  routineId: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  label?: string;
  subtitle?: string;
};

const SubmitButton = ({
  disabled,
  variant,
  label,
  subtitle,
}: {
  disabled: boolean;
  variant: "primary" | "secondary";
  label: string;
  subtitle?: string;
}): React.ReactElement => {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  if (variant === "primary") {
    return (
      <button
        type="submit"
        disabled={isDisabled}
        className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-mineral-300 px-7 font-mono text-[12px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200 focus:outline-none focus:ring-2 focus:ring-mineral-400 focus:ring-offset-2 focus:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? (
          <>
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950"
              aria-hidden="true"
            />
            Cargando…
          </>
        ) : (
          label
        )}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="hairline group flex w-full min-h-15 items-center justify-between gap-3 rounded-2xl bg-ink-900/40 px-4 py-3 text-left transition-colors hover:bg-ink-900/70 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="min-w-0">
        <p className="truncate font-display text-base leading-tight">{label}</p>
        {subtitle ? (
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-300 transition-colors group-hover:text-mineral-200">
        {pending ? (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink-300/30 border-t-ink-300"
            aria-hidden="true"
          />
        ) : (
          "Iniciar →"
        )}
      </span>
    </button>
  );
};

export const StartSessionButton = ({
  routineId,
  disabled = false,
  variant = "primary",
  label = "Empezar entreno",
  subtitle,
}: Props): React.ReactElement => (
  <form action={startSessionAction}>
    <input type="hidden" name="routineId" value={routineId} />
    <SubmitButton disabled={disabled} variant={variant} label={label} subtitle={subtitle} />
  </form>
);
