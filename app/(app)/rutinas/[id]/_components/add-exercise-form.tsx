"use client";

import { useActionState, useMemo, useState } from "react";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { addRoutineExerciseAction } from "../../actions";

type ExerciseType = "strength" | "cardio" | "isometric" | "bodyweight";

export type ExerciseOption = {
  id: string;
  name: string;
  target_muscle: string | null;
  equipment: string | null;
  type: ExerciseType;
};

type Props = {
  routineId: string;
  exercises: ExerciseOption[];
};

export const AddExerciseForm = ({ routineId, exercises }: Props): React.ReactElement => {
  const [state, formAction] = useActionState(addRoutineExerciseAction, undefined);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => exercises.find((e) => e.id === selectedId) ?? null,
    [exercises, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises.slice(0, 30);
    return exercises
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.target_muscle ?? "").toLowerCase().includes(q) ||
          (e.equipment ?? "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [exercises, query]);

  const type = selected?.type;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="exerciseId" value={selectedId ?? ""} />

      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-300">
          Ejercicio
        </label>
        <div className="mt-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, músculo o equipamiento…"
            className="h-12 w-full rounded-md border border-white/10 bg-ink-800/60 px-4 text-[14px] text-ink-50 outline-none transition-all placeholder:text-ink-300 hover:border-white/20 focus:border-mineral-400/80 focus:bg-ink-800 focus:ring-4 focus:ring-mineral-400/10"
          />
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-white/5 bg-ink-950/40">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-300">Sin resultados.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map((ex) => {
                const active = ex.id === selectedId;
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(ex.id)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                        active ? "bg-mineral-500/10" : "hover:bg-white/5"
                      }`}
                    >
                      <span className="flex flex-col">
                        <span className="text-[14px] text-ink-50">{ex.name}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
                          {ex.target_muscle ?? "—"} · {ex.equipment ?? "—"} · {ex.type}
                        </span>
                      </span>
                      {active ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mineral-300">
                          Seleccionado
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {selected ? (
        <div className="grid grid-cols-2 gap-3">
          {(type === "strength" || type === "bodyweight") && (
            <>
              <Field label="Series" name="targetSets" type="number" min={1} />
              <Field label="Reps" name="targetReps" type="number" min={1} />
            </>
          )}
          {type === "strength" && (
            <Field
              label="Peso (kg)"
              name="targetWeight"
              type="number"
              step="0.5"
              min={0}
              className="col-span-2"
            />
          )}
          {(type === "isometric" || type === "cardio") && (
            <Field
              label={type === "cardio" ? "Duración (s)" : "Tiempo (s)"}
              name="targetDuration"
              type="number"
              min={1}
              className="col-span-2"
            />
          )}
          <Field
            label="Notas (opcional)"
            name="notes"
            maxLength={200}
            className="col-span-2"
          />
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-[13px] text-ember-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-[13px] text-mineral-300" role="status">
          {state.success}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Añadiendo…">Añadir ejercicio</SubmitButton>
    </form>
  );
};
