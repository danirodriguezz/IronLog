import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekDays } from "@/lib/week";
import { CreateRoutineDialog } from "./_components/create-routine-dialog";
import { AIRoutineDialog } from "./_components/ai-routine-dialog";
import { WeekBoard, type RoutineCard } from "./_components/week-board";

type RoutineRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  day_of_week: number | null;
  routine_exercises: { count: number }[];
};

const RutinasPage = async (): Promise<React.ReactElement> => {
  const supabase = await createClient();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, name, description, updated_at, day_of_week, routine_exercises(count)")
    .order("updated_at", { ascending: false })
    .returns<RoutineRow[]>();

  const list = routines ?? [];
  const cards: RoutineCard[] = list.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    dayOfWeek: r.day_of_week,
    exerciseCount: r.routine_exercises?.[0]?.count ?? 0,
  }));
  const week = getCurrentWeekDays();
  const assignedCount = cards.filter((c) => c.dayOfWeek !== null).length;
  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(week[0]?.date ?? new Date());

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 md:py-16">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
            Tus rutinas · <span className="text-ink-300">{monthLabel}</span>
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[0.98] tracking-tight">
            Diseña tu <em className="not-italic text-mineral-200">semana</em>.
          </h1>
          <p className="max-w-xl text-ink-200 text-base sm:text-lg">
            Arrastra cada rutina al día que quieras entrenar. Las que no asignes se quedan
            guardadas para usarlas cuando toque.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-stretch gap-3 md:gap-4">
          {cards.length > 0 && (
            <>
              <Stat label="Asignadas" value={assignedCount} total={7} accent />
              <Stat label="En banco" value={cards.length - assignedCount} />
            </>
          )}
          <div className="flex items-stretch gap-3">
            <div className="self-end">
              <AIRoutineDialog routineCount={cards.length} />
            </div>
            <div className="self-end">
              <CreateRoutineDialog variant="primary" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        {cards.length === 0 ? <EmptyState /> : <WeekBoard routines={cards} week={week} />}
      </section>
    </div>
  );
};

type StatProps = {
  label: string;
  value: number;
  total?: number;
  accent?: boolean;
};

const Stat = ({ label, value, total, accent }: StatProps): React.ReactElement => (
  <div
    className={`hairline flex min-w-24 flex-col gap-1 rounded-2xl px-4 py-3 ${
      accent ? "bg-mineral-700/10" : "bg-ink-900/40"
    }`}
  >
    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">{label}</p>
    <p className="font-display text-2xl tabular-nums leading-none">
      <span className={accent ? "text-mineral-200" : "text-ink-50"}>{value}</span>
      {typeof total === "number" && (
        <span className="text-ink-400 text-lg"> / {total}</span>
      )}
    </p>
  </div>
);

const EmptyState = (): React.ReactElement => (
  <div className="hairline relative overflow-hidden rounded-2xl bg-ink-900/40 px-6 py-12 text-center sm:px-10 sm:py-16">
    <div className="relative mx-auto max-w-md space-y-4">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-mineral-700/20 ring-1 ring-mineral-400/30">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-mineral-300"
          />
        </svg>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-300">
        Aún no tienes rutinas
      </p>
      <h3 className="font-display text-2xl leading-tight">Crea tu primera rutina.</h3>
      <p className="text-sm text-ink-200">
        Da de alta una plantilla y empieza a organizar tu semana.
      </p>
      <div className="pt-2">
        <CreateRoutineDialog variant="primary" label="Crear rutina" />
      </div>
    </div>
  </div>
);

export default RutinasPage;
