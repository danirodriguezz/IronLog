import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddExerciseForm, type ExerciseOption } from "./_components/add-exercise-form";
import { AddExerciseTrigger } from "./_components/add-exercise-trigger";
import { RemoveExerciseButton } from "./_components/remove-exercise-button";
import { DeleteRoutineButton } from "./_components/delete-routine-button";

type RoutineExerciseRow = {
  id: string;
  order_index: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_duration_seconds: number | null;
  notes: string | null;
  exercises: {
    id: string;
    name: string;
    target_muscle: string | null;
    equipment: string | null;
    type: ExerciseOption["type"];
  } | null;
};

const formatTarget = (row: RoutineExerciseRow): string => {
  const type = row.exercises?.type;
  const parts: string[] = [];

  if (type === "strength" || type === "bodyweight") {
    if (row.target_sets) parts.push(`${row.target_sets} series`);
    if (row.target_reps) parts.push(`${row.target_reps} reps`);
  }
  if (type === "strength" && row.target_weight_kg) {
    parts.push(`${row.target_weight_kg} kg`);
  }
  if ((type === "isometric" || type === "cardio") && row.target_duration_seconds) {
    parts.push(`${row.target_duration_seconds}s`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Sin objetivo";
};

const RoutineDetailPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> => {
  const { id } = await params;
  const supabase = await createClient();

  const [routineRes, exercisesRes, catalogRes] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, description, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("routine_exercises")
      .select(
        "id, order_index, target_sets, target_reps, target_weight_kg, target_duration_seconds, notes, exercises(id, name, target_muscle, equipment, type)",
      )
      .eq("routine_id", id)
      .order("order_index", { ascending: true })
      .returns<RoutineExerciseRow[]>(),
    supabase
      .from("exercises")
      .select("id, name, target_muscle, equipment, type")
      .order("name", { ascending: true })
      .returns<ExerciseOption[]>(),
  ]);

  if (!routineRes.data) notFound();

  const routine = routineRes.data;
  const items = exercisesRes.data ?? [];
  const catalog = catalogRes.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <Link
        href="/rutinas"
        className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300 transition-colors hover:text-ink-50"
      >
        ← Rutinas
      </Link>

      <section className="mt-6 flex items-start justify-between gap-6">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
            Rutina
          </p>
          <h1 className="font-display text-4xl md:text-5xl leading-[0.98] tracking-tight">
            {routine.name}
          </h1>
          {routine.description ? (
            <p className="max-w-xl text-ink-200">{routine.description}</p>
          ) : null}
        </div>
        <DeleteRoutineButton id={routine.id} />
      </section>

      <section className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">
            Ejercicios ({items.length})
          </h2>
          <ol className="mt-5 space-y-3">
            {items.map((row, idx) => (
              <li
                key={row.id}
                className="hairline group flex items-center justify-between gap-4 rounded-2xl bg-ink-900/50 p-5 transition-colors hover:bg-ink-900/80"
              >
                <div className="flex items-start gap-4">
                  <span className="font-mono text-[12px] text-ink-300 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-display text-lg leading-tight">
                      {row.exercises?.name ?? "—"}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">
                      {row.exercises?.target_muscle ?? "—"} ·{" "}
                      {row.exercises?.equipment ?? "—"} · {formatTarget(row)}
                    </p>
                    {row.notes ? (
                      <p className="mt-2 text-sm text-ink-200">{row.notes}</p>
                    ) : null}
                  </div>
                </div>
                <RemoveExerciseButton id={row.id} routineId={routine.id} />
              </li>
            ))}
            {items.length === 0 ? (
              <li className="hairline rounded-2xl bg-ink-900/40 p-8 text-ink-200">
                Esta rutina todavía no tiene ejercicios. Toca el botón + para añadir el primero.
              </li>
            ) : null}
          </ol>
        </div>

        {/* Desktop sidebar — hidden on mobile */}
        <aside className="hairline hidden h-fit rounded-2xl bg-ink-900/50 p-6 lg:block">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mineral-300">
            Añadir ejercicio
          </p>
          <h3 className="mt-2 font-display text-2xl leading-tight">
            Del catálogo a tu rutina.
          </h3>
          <div className="mt-5">
            <AddExerciseForm routineId={routine.id} exercises={catalog} />
          </div>
        </aside>
      </section>

      {/* Mobile FAB + bottom-sheet */}
      <AddExerciseTrigger routineId={routine.id} exercises={catalog} />
    </div>
  );
};

export default RoutineDetailPage;
