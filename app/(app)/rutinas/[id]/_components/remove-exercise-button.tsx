"use client";

import { useFormStatus } from "react-dom";
import { removeRoutineExerciseAction } from "../../actions";

type Props = {
  id: string;
  routineId: string;
};

const Inner = (): React.ReactElement => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Eliminar ejercicio"
      className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-ember-500/10 hover:text-ember-400 disabled:opacity-50"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    </button>
  );
};

export const RemoveExerciseButton = ({ id, routineId }: Props): React.ReactElement => (
  <form action={removeRoutineExerciseAction}>
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="routineId" value={routineId} />
    <Inner />
  </form>
);
