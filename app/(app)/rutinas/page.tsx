import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateRoutineForm } from "./_components/create-routine-form";

type RoutineRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  routine_exercises: { count: number }[];
};

const RutinasPage = async (): Promise<React.ReactElement> => {
  const supabase = await createClient();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, description, updated_at, routine_exercises(count)")
    .order("updated_at", { ascending: false })
    .returns<RoutineRow[]>();

  const list = routines ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <section className="space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
          Tus rutinas
        </p>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.98] tracking-tight">
          Diseña tus <em className="not-italic text-mineral-200">splits</em>.
        </h1>
        <p className="max-w-xl text-ink-200 text-lg">
          Crea plantillas con los ejercicios de cada día de entrenamiento. Podrás lanzarlas en una
          sesión cuando toque entrenar.
        </p>
      </section>

      <section className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">
            {list.length > 0 ? `${list.length} rutina${list.length === 1 ? "" : "s"}` : "Sin rutinas"}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {list.map((r) => {
              const count = r.routine_exercises?.[0]?.count ?? 0;
              return (
                <Link
                  key={r.id}
                  href={`/rutinas/${r.id}`}
                  className="group hairline relative overflow-hidden rounded-2xl bg-ink-900/50 p-6 transition-colors hover:bg-ink-900/80"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-300">
                    {count} ejercicio{count === 1 ? "" : "s"}
                  </p>
                  <p className="mt-3 font-display text-2xl leading-tight tracking-tight">
                    {r.name}
                  </p>
                  {r.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-200">{r.description}</p>
                  ) : null}
                  <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 group-hover:text-mineral-300">
                    Abrir →
                  </p>
                </Link>
              );
            })}
            {list.length === 0 ? (
              <div className="hairline col-span-full rounded-2xl bg-ink-900/40 p-8 text-ink-200">
                Aún no tienes rutinas. Crea la primera a la derecha.
              </div>
            ) : null}
          </div>
        </div>

        <aside className="hairline h-fit rounded-2xl bg-ink-900/50 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mineral-300">
            Nueva rutina
          </p>
          <h3 className="mt-2 font-display text-2xl leading-tight">Empieza un split.</h3>
          <p className="mt-2 text-sm text-ink-200">
            Luego añade ejercicios desde el catálogo.
          </p>
          <div className="mt-5">
            <CreateRoutineForm />
          </div>
        </aside>
      </section>
    </div>
  );
};

export default RutinasPage;
