"use client";

import { useEffect, useRef } from "react";
import { AddExerciseForm, type ExerciseOption } from "./add-exercise-form";

type Props = {
  routineId: string;
  exercises: ExerciseOption[];
  open: boolean;
  onClose: () => void;
};

export const AddExerciseSheet = ({ routineId, exercises, open, onClose }: Props): React.ReactElement => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Añadir ejercicio"
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl border-t border-white/8 bg-ink-900 transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "92dvh" }}
      >
        {/* Handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-ink-600" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mineral-300">
              Añadir ejercicio
            </p>
            <h2 className="mt-0.5 font-display text-xl leading-tight">
              Del catálogo a tu rutina.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-8">
          <AddExerciseForm routineId={routineId} exercises={exercises} onSuccess={onClose} />
        </div>
      </div>
    </>
  );
};
