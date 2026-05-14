"use client";

import { useFormStatus } from "react-dom";
import { deleteRoutineAction } from "../../actions";

const Inner = (): React.ReactElement => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 sm:flex-none rounded-md border border-ember-500/30 px-4 py-2.5 text-[12px] font-mono uppercase tracking-[0.2em] text-ember-400 transition-colors hover:bg-ember-500/10 disabled:opacity-50"
    >
      {pending ? "Eliminando…" : "Eliminar rutina"}
    </button>
  );
};

export const DeleteRoutineButton = ({ id }: { id: string }): React.ReactElement => (
  <form action={deleteRoutineAction}>
    <input type="hidden" name="id" value={id} />
    <Inner />
  </form>
);
