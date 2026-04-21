"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createRoutineAction } from "../actions";
import { getDayLongLabel } from "@/lib/week";

type TriggerVariant = "primary" | "ghost" | "slot";

type Props = {
  variant?: TriggerVariant;
  defaultDayOfWeek?: number | null;
  label?: string;
  ariaLabel?: string;
};

export const CreateRoutineDialog = ({
  variant = "primary",
  defaultDayOfWeek = null,
  label,
  ariaLabel,
}: Props): React.ReactElement => {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const trigger =
    variant === "slot" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel ?? "Crear rutina para este día"}
        className="group mt-auto flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-600/50 py-4 transition-all duration-200 hover:border-mineral-300/50 hover:bg-mineral-700/5 focus:outline-none focus:ring-1 focus:ring-mineral-300"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-800/60 text-ink-300 ring-1 ring-ink-600/60 transition-colors group-hover:bg-mineral-700/20 group-hover:text-mineral-200 group-hover:ring-mineral-400/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500 group-hover:text-mineral-300">
          Añadir
        </span>
      </button>
    ) : variant === "ghost" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hairline inline-flex items-center gap-2 rounded-[14px] bg-ink-900/50 px-4 py-2.5 text-sm text-ink-100 transition-colors hover:bg-ink-800/80 focus:outline-none focus:ring-1 focus:ring-mineral-300"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {label ?? "Nueva rutina"}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex h-11 items-center gap-2 rounded-[14px] bg-ink-50 px-4 text-[14px] font-medium tracking-tight text-ink-950 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-mineral-300 focus:ring-offset-2 focus:ring-offset-ink-950"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        {label ?? "Nueva rutina"}
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <DialogContent
          titleId={titleId}
          defaultDayOfWeek={defaultDayOfWeek}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

type DialogContentProps = {
  titleId: string;
  defaultDayOfWeek: number | null;
  onClose: () => void;
};

const DialogContent = ({
  titleId,
  defaultDayOfWeek,
  onClose,
}: DialogContentProps): React.ReactElement => {
  const [state, formAction] = useActionState(createRoutineAction, undefined);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  const dayLabel =
    defaultDayOfWeek !== null && defaultDayOfWeek !== undefined
      ? getDayLongLabel(defaultDayOfWeek)
      : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-950/70 backdrop-blur-sm animate-[fadeInUp_.2s_ease-out]"
      />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-ink-900/95 p-6 shadow-[var(--shadow-card)] backdrop-blur-md hairline animate-[fadeInUp_.3s_var(--ease-spring)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mineral-400 shadow-[0_0_8px_var(--color-mineral-400)]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mineral-300">
                Nueva rutina
              </p>
            </div>
            <h2 id={titleId} className="mt-2 font-display text-2xl leading-tight">
              {dayLabel ? (
                <>
                  Crea una para <em className="not-italic text-mineral-200">{dayLabel}</em>.
                </>
              ) : (
                "Empieza un split."
              )}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-ink-800/80 hover:text-ink-50 focus:outline-none focus:ring-1 focus:ring-mineral-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          {defaultDayOfWeek !== null && defaultDayOfWeek !== undefined && (
            <input type="hidden" name="dayOfWeek" value={defaultDayOfWeek} />
          )}
          <input type="hidden" name="redirectTo" value="list" />
          <Field
            ref={nameRef}
            label="Nombre"
            name="name"
            required
            maxLength={80}
            autoComplete="off"
            hint="Ej: Día de pierna, Empuje, Full body A…"
          />
          <Field
            label="Descripción (opcional)"
            name="description"
            maxLength={200}
            autoComplete="off"
          />
          {state?.error && (
            <p className="text-[13px] text-ember-400" role="alert">
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-shrink-0 rounded-[14px] px-4 text-sm text-ink-200 transition-colors hover:bg-ink-800/60"
            >
              Cancelar
            </button>
            <div className="flex-1">
              <SubmitButton pendingLabel="Creando…">Crear rutina</SubmitButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
