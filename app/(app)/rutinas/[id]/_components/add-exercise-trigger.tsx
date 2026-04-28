"use client";

import { useState, useCallback } from "react";
import { AddExerciseSheet } from "./add-exercise-sheet";
import type { ExerciseOption } from "./add-exercise-form";

type Props = {
  routineId: string;
  exercises: ExerciseOption[];
};

export const AddExerciseTrigger = ({ routineId, exercises }: Props): React.ReactElement => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* FAB — only visible on mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Añadir ejercicio"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-mineral-500 text-ink-950 shadow-lg shadow-mineral-500/20 transition-all duration-200 hover:scale-105 hover:bg-mineral-400 active:scale-95 lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <AddExerciseSheet
        routineId={routineId}
        exercises={exercises}
        open={open}
        onClose={close}
      />
    </>
  );
};
