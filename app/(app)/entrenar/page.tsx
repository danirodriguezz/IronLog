import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDayLongLabel } from "@/lib/week";
import { startSessionAction } from "./actions";

type TodayRoutine = {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
};

type SessionRow = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  status: "active" | "completed" | "discarded";
  routine_id: string | null;
  session_exercises: { count: number }[];
};

type OtherRoutine = {
  id: string;
  name: string;
  day_of_week: number | null;
};

const isoToday = (): number => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

const formatDuration = (startIso: string, endIso: string | null): string => {
  if (!endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const EntrenarPage = async (): Promise<React.ReactElement> => {
  const supabase = await createClient();
  const today = isoToday();

  const [todayRes, otherRes, activeRes, historyRes] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, description, routine_exercises(count)")
      .eq("day_of_week", today)
      .maybeSingle(),
    supabase
      .from("routines")
      .select("id, name, day_of_week")
      .order("day_of_week", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })
      .returns<OtherRoutine[]>(),
    supabase
      .from("sessions")
      .select("id, name, started_at, status")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, name, started_at, ended_at, status, routine_id, session_exercises(count)")
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(20)
      .returns<SessionRow[]>(),
  ]);

  const todayRoutine: TodayRoutine | null = todayRes.data
    ? {
        id: todayRes.data.id,
        name: todayRes.data.name,
        description: todayRes.data.description,
        exerciseCount:
          (todayRes.data as { routine_exercises?: { count: number }[] }).routine_exercises?.[0]
            ?.count ?? 0,
      }
    : null;

  const activeSession = activeRes.data;
  const other = (otherRes.data ?? []).filter((r) => r.id !== todayRoutine?.id);
  const history = historyRes.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 md:py-14">
      <section className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
          Entrenar · {getDayLongLabel(today)}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[0.98] tracking-tight">
          Hoy <em className="not-italic text-mineral-200">toca</em>.
        </h1>
      </section>

      {activeSession ? (
        <section className="mt-8">
          <Link
            href={`/entrenar/${activeSession.id}`}
            className="hairline group flex items-center justify-between gap-4 rounded-2xl bg-mineral-700/15 p-5 ring-1 ring-mineral-400/30 transition-colors hover:bg-mineral-700/20"
          >
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-300">
                Entreno en curso
              </p>
              <p className="mt-1 truncate font-display text-xl leading-tight">
                {activeSession.name}
              </p>
              <p className="mt-1 font-mono text-[11px] text-ink-300 tabular-nums">
                Empezado {formatDate(activeSession.started_at)}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-mineral-300 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-950 transition-transform group-hover:scale-[1.02]">
              Continuar →
            </span>
          </Link>
        </section>
      ) : null}

      <section className="mt-10">
        {todayRoutine ? (
          <div className="hairline relative overflow-hidden rounded-2xl bg-linear-to-br from-mineral-700/20 to-ink-950/80 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-300">
                  Rutina de hoy · {todayRoutine.exerciseCount} ejercicio
                  {todayRoutine.exerciseCount === 1 ? "" : "s"}
                </p>
                <h2 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                  {todayRoutine.name}
                </h2>
                {todayRoutine.description ? (
                  <p className="max-w-lg text-ink-200">{todayRoutine.description}</p>
                ) : null}
              </div>

              <form action={startSessionAction} className="shrink-0">
                <input type="hidden" name="routineId" value={todayRoutine.id} />
                <button
                  type="submit"
                  disabled={Boolean(activeSession) || todayRoutine.exerciseCount === 0}
                  className="inline-flex min-h-13 items-center justify-center rounded-full bg-mineral-300 px-7 font-mono text-[12px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200 focus:outline-none focus:ring-2 focus:ring-mineral-400 focus:ring-offset-2 focus:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Empezar entreno
                </button>
              </form>
            </div>
            {todayRoutine.exerciseCount === 0 ? (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ember-400">
                Añade ejercicios a la rutina antes de empezar
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyToday />
        )}
      </section>

      {other.length > 0 ? (
        <section className="mt-10">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">
            O entrena otra rutina
          </h3>
          <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {other.map((r) => (
              <li key={r.id}>
                <form action={startSessionAction}>
                  <input type="hidden" name="routineId" value={r.id} />
                  <button
                    type="submit"
                    disabled={Boolean(activeSession)}
                    className="hairline group flex w-full min-h-15 items-center justify-between gap-3 rounded-2xl bg-ink-900/40 px-4 py-3 text-left transition-colors hover:bg-ink-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-base leading-tight">{r.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                        {r.day_of_week ? getDayLongLabel(r.day_of_week) : "Sin día"}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-300 transition-colors group-hover:text-mineral-200">
                      Iniciar →
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">
            Historial
          </h3>
          <p className="font-mono tabular-nums text-[10px] uppercase tracking-[0.2em] text-ink-400">
            {String(history.length).padStart(2, "0")} entreno{history.length === 1 ? "" : "s"}
          </p>
        </div>
        {history.length === 0 ? (
          <p className="mt-5 hairline rounded-2xl bg-ink-900/40 p-6 text-ink-300">
            Aún no has completado ningún entreno. Dale a <em className="not-italic text-mineral-200">Empezar</em> cuando estés listo.
          </p>
        ) : (
          <ol className="mt-5 space-y-2.5">
            {history.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/entrenar/historial/${s.id}`}
                  className="hairline group flex items-center justify-between gap-4 rounded-2xl bg-ink-900/40 p-4 transition-colors hover:bg-ink-900/80"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-base leading-tight">{s.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 tabular-nums">
                      {formatDate(s.started_at)} · {formatDuration(s.started_at, s.ended_at)} ·{" "}
                      {s.session_exercises?.[0]?.count ?? 0} ej.
                    </p>
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-300 transition-colors group-hover:text-mineral-200">
                    Ver →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};

const EmptyToday = (): React.ReactElement => (
  <div className="hairline rounded-2xl bg-ink-900/40 p-8 text-center">
    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
      Hoy es día de descanso
    </p>
    <p className="mt-3 font-display text-2xl leading-tight">No tienes rutina asignada.</p>
    <p className="mt-2 text-sm text-ink-200">
      Puedes iniciar una rutina libremente desde la lista o{" "}
      <Link href="/rutinas" className="text-mineral-200 underline-offset-2 hover:underline">
        asignar una al día
      </Link>
      .
    </p>
  </div>
);

export default EntrenarPage;
