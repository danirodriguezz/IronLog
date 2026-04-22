import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SetRow = {
  is_pr: boolean;
};

type ExerciseRow = {
  name: string;
  type: "strength" | "cardio" | "isometric" | "bodyweight";
  target_muscle: string | null;
};

type SessionExerciseRow = {
  id: string;
  order_index: number;
  exercises: ExerciseRow | null;
  sets: SetRow[];
};

type ActivitySession = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  session_exercises: SessionExerciseRow[];
};

export const formatRelativeDate = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(date);
};

const formatTime = (iso: string): string =>
  new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const formatDuration = (startIso: string, endIso: string | null): string => {
  if (!endIso) return "—";
  const mins = Math.max(1, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`;
};

const typeLabel: Record<ExerciseRow["type"], string> = {
  strength: "Fuerza",
  cardio: "Cardio",
  isometric: "Isométrico",
  bodyweight: "Peso corporal",
};

export const ActivityFeed = async ({ userId }: { userId: string }): Promise<React.ReactElement> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sessions")
    .select(
      `id, name, started_at, ended_at,
       session_exercises(
         id, order_index,
         exercises(name, type, target_muscle),
         sets(is_pr)
       )`
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(20);

  const rawSessions = (data ?? []) as unknown as ActivitySession[];

  const sessions = rawSessions.map((s) => ({
    ...s,
    session_exercises: [...s.session_exercises].sort((a, b) => a.order_index - b.order_index),
  }));

  if (sessions.length === 0) {
    return (
      <div className="mt-8 hairline rounded-2xl bg-ink-900/30 px-6 py-12 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
          Aún no hay entrenos completados
        </p>
        <p className="mt-2 text-sm text-ink-300">
          Completa tu primer entreno para verlo aquí.
        </p>
        <Link
          href="/entrenar"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-mineral-700/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-mineral-300 ring-1 ring-mineral-700/40 transition-colors hover:bg-mineral-700/30"
        >
          Ir a entrenar
        </Link>
      </div>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
          {sessions.length === 20 ? "Últimos 20 entrenos" : `${sessions.length} entreno${sessions.length !== 1 ? "s" : ""}`}
        </span>
        <Link
          href="/entrenar"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400 transition-colors hover:text-ink-200"
        >
          Ver historial
        </Link>
      </div>

      <ol className="mt-6 space-y-3">
        {sessions.map((session) => {
          const exercises = session.session_exercises;
          const totalSets = exercises.reduce((acc, se) => acc + se.sets.length, 0);
          const prCount = exercises.reduce(
            (acc, se) => acc + se.sets.filter((s) => s.is_pr).length,
            0
          );
          const exerciseNames = exercises
            .map((se) => se.exercises?.name)
            .filter(Boolean) as string[];

          const types = [...new Set(exercises.map((se) => se.exercises?.type).filter(Boolean))] as ExerciseRow["type"][];

          return (
            <li key={session.id}>
              <Link
                href={`/entrenar/historial/${session.id}`}
                className="group block hairline rounded-2xl bg-ink-900/40 p-5 transition-colors hover:bg-ink-900/70"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 tabular-nums">
                        {formatRelativeDate(session.started_at)}
                        <span className="mx-1.5 text-ink-600">·</span>
                        {formatTime(session.started_at)}
                      </p>
                      {prCount > 0 && (
                        <span className="rounded-full bg-mineral-700/25 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-mineral-300 ring-1 ring-mineral-700/40">
                          {prCount} PR{prCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 font-display text-xl leading-tight tracking-tight text-ink-50 group-hover:text-white transition-colors">
                      {session.name}
                    </h3>
                  </div>

                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 shrink-0 text-ink-500 transition-colors group-hover:text-ink-300"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

                {/* Stats row */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <StatChip icon="clock" value={formatDuration(session.started_at, session.ended_at)} />
                  <StatChip icon="layers" value={`${exercises.length} ejercicio${exercises.length !== 1 ? "s" : ""}`} />
                  <StatChip icon="repeat" value={`${totalSets} serie${totalSets !== 1 ? "s" : ""}`} />
                  {types.map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500"
                    >
                      {typeLabel[t]}
                    </span>
                  ))}
                </div>

                {/* Exercise list */}
                {exerciseNames.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {exerciseNames.slice(0, 6).map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-ink-800/80 px-2.5 py-1 font-mono text-[10px] tracking-wide text-ink-300"
                      >
                        {name}
                      </span>
                    ))}
                    {exerciseNames.length > 6 && (
                      <span className="rounded-full bg-ink-800/80 px-2.5 py-1 font-mono text-[10px] tracking-wide text-ink-500">
                        +{exerciseNames.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ol>

      {sessions.length === 20 && (
        <div className="mt-4 text-center">
          <Link
            href="/entrenar"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400 transition-colors hover:text-ink-200"
          >
            Ver todo el historial →
          </Link>
        </div>
      )}
    </section>
  );
};

const StatChip = ({
  icon,
  value,
}: {
  icon: "clock" | "layers" | "repeat";
  value: string;
}): React.ReactElement => {
  const paths: Record<typeof icon, React.ReactElement> = {
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </>
    ),
    layers: (
      <>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </>
    ),
    repeat: (
      <>
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>
    ),
  };

  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-ink-300">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink-500 shrink-0"
      >
        {paths[icon]}
      </svg>
      {value}
    </span>
  );
};
