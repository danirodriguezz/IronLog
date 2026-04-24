import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SessionRow = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  status: "active" | "completed" | "discarded";
  routine_id: string | null;
  user_id: string;
};

type SessionExerciseRow = {
  id: string;
  order_index: number;
  exercise_id: string;
  exercises: {
    id: string;
    name: string;
    target_muscle: string | null;
    type: "strength" | "cardio" | "isometric" | "bodyweight";
  } | null;
  sets: {
    set_number: number;
    reps: number | null;
    weight_kg: number | null;
    duration_seconds: number | null;
    distance_meters: number | null;
    is_pr: boolean;
  }[];
};

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));

const formatMetersToKm = (meters: number): string => {
  if (meters < 1000) return `${meters}m`;
  const km = meters / 1000;
  return `${km.toFixed(2)}km`;
}

const formatDuration = (startIso: string, endIso: string | null): string => {
  if (!endIso) return "—";
  const mins = Math.max(1, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const ALLOWED_BACK_PATHS = ["/entrenar", "/profile"] as const;

const resolveBack = (raw: string | undefined): { href: string; label: string } => {
  if (raw) {
    const decoded = decodeURIComponent(raw);
    if ((ALLOWED_BACK_PATHS as readonly string[]).includes(decoded)) {
      const labels: Record<string, string> = { "/entrenar": "Historial", "/profile": "Perfil" };
      return { href: decoded, label: labels[decoded] };
    }
  }
  return { href: "/entrenar", label: "Historial" };
};

const HistorySessionPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> => {
  const [{ sessionId }, sp] = await Promise.all([params, searchParams]);
  const back = resolveBack(typeof sp.back === "string" ? sp.back : undefined);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, started_at, ended_at, notes, status, routine_id, user_id")
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();

  if (!session) notFound();
  if (session.status === "active") redirect(`/entrenar/${sessionId}`);

  const [exercisesRes, prevRes, nextRes, totalPrsRes] = await Promise.all([
    supabase
      .from("session_exercises")
      .select(
        "id, order_index, exercise_id, exercises(id, name, target_muscle, type), sets(set_number, reps, weight_kg, duration_seconds, distance_meters, is_pr)",
      )
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true })
      .returns<SessionExerciseRow[]>(),
    supabase
      .from("sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .lt("started_at", session.started_at)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gt("started_at", session.started_at)
      .order("started_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_pr", true)
      .in(
        "session_exercise_id",
        (
          await supabase.from("session_exercises").select("id").eq("session_id", sessionId)
        ).data?.map((r) => r.id) ?? ["00000000-0000-0000-0000-000000000000"],
      ),
  ]);

  const items = (exercisesRes.data ?? []).map((row) => ({
    ...row,
    sets: [...row.sets].sort((a, b) => a.set_number - b.set_number),
  }));
  const totalSets = items.reduce((acc, it) => acc + it.sets.length, 0);
  const prCount = totalPrsRes.count ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={back.href}
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300 transition-colors hover:text-ink-50"
        >
          ← {back.label}
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href={`/entrenar/historial/${sessionId}/editar`}
            className="hairline inline-flex h-9 sm:h-10 items-center justify-center rounded-full bg-ink-900/50 px-3 sm:px-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-ink-200 transition-colors hover:bg-ink-900"
          >
            Editar
          </Link>
          {prevRes.data ? (
            <Link
              href={`/entrenar/historial/${prevRes.data.id}`}
              aria-label="Entreno anterior"
              className="hairline inline-flex h-9 w-9 sm:h-10 sm:w-auto sm:px-4 items-center justify-center rounded-full bg-ink-900/50 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-ink-200 transition-colors hover:bg-ink-900"
            >
              <span className="sm:hidden">←</span>
              <span className="hidden sm:inline">← Anterior</span>
            </Link>
          ) : (
            <span
              aria-disabled
              className="inline-flex h-9 w-9 sm:h-10 sm:w-auto sm:px-4 items-center justify-center rounded-full font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-ink-600"
            >
              <span className="sm:hidden">←</span>
              <span className="hidden sm:inline">← Anterior</span>
            </span>
          )}
          {nextRes.data ? (
            <Link
              href={`/entrenar/historial/${nextRes.data.id}`}
              aria-label="Entreno siguiente"
              className="hairline inline-flex h-9 w-9 sm:h-10 sm:w-auto sm:px-4 items-center justify-center rounded-full bg-ink-900/50 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-ink-200 transition-colors hover:bg-ink-900"
            >
              <span className="sm:hidden">→</span>
              <span className="hidden sm:inline">Siguiente →</span>
            </Link>
          ) : (
            <span
              aria-disabled
              className="inline-flex h-9 w-9 sm:h-10 sm:w-auto sm:px-4 items-center justify-center rounded-full font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-ink-600"
            >
              <span className="sm:hidden">→</span>
              <span className="hidden sm:inline">Siguiente →</span>
            </span>
          )}
        </nav>
      </div>

      <header className="mt-5 sm:mt-6 space-y-2 sm:space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-300">
          Entreno completado
        </p>
        <h1 className="font-display text-2xl sm:text-4xl md:text-5xl leading-[1.02] tracking-tight">
          {session.name}
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400 tabular-nums">
          {formatDate(session.started_at)}
        </p>
      </header>

      <div className="mt-5 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-2.5">
        <Stat label="Duración" value={formatDuration(session.started_at, session.ended_at)} />
        <Stat label="Series" value={String(totalSets)} />
        <Stat label="PRs" value={String(prCount)} accent={prCount > 0} />
      </div>

      <ol className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
        {items.map((item, idx) => {
          const ex = item.exercises;
          const usesWeight = ex?.type === "strength";
          const usesDistance = ex?.type === "cardio";
          const usesReps = ex?.type === "strength" || ex?.type === "bodyweight";
          const usesDuration = ex?.type === "isometric" || ex?.type === "cardio";

          return (
            <li key={item.id} className="hairline rounded-2xl bg-ink-900/50 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono text-[11px] tabular-nums text-ink-400 pt-1">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg leading-tight">{ex?.name ?? "—"}</h3>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                      {ex?.target_muscle ?? "—"}
                    </p>
                  </div>
                </div>
                {item.sets.some((s) => s.is_pr) ? (
                  <span className="rounded-full bg-mineral-300 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-950">
                    PR
                  </span>
                ) : null}
              </div>

              {item.sets.length === 0 ? (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500">
                  Sin series registradas
                </p>
              ) : (
                <ul className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                  {item.sets.map((s) => (
                    <li
                      key={s.set_number}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 font-mono text-[12px] tabular-nums ${
                        s.is_pr
                          ? "bg-mineral-700/20 ring-1 ring-mineral-400/40"
                          : "bg-ink-950/50"
                      }`}
                    >
                      <span className="text-ink-400">#{s.set_number}</span>
                      <span className="text-ink-50">
                        {usesWeight && s.weight_kg !== null ? `${s.weight_kg}kg` : ""}
                        {usesDistance && s.distance_meters !== null ? `${formatMetersToKm(s.distance_meters)}` : ""}
                        {(usesWeight || usesDistance) && (s.reps !== null || s.duration_seconds !== null) ? " · " : ""}
                        {usesReps && s.reps !== null ? `${s.reps}r` : ""}
                        {usesDuration && s.duration_seconds !== null ? `${s.duration_seconds}s` : ""}
                      </span>
                      {s.is_pr ? (
                        <span className="text-[9px] uppercase text-mineral-200">PR</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const Stat = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): React.ReactElement => (
  <div
    className={`hairline rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${
      accent ? "bg-mineral-700/15" : "bg-ink-900/40"
    }`}
  >
    <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-ink-400">{label}</p>
    <p
      className={`mt-1 font-display text-lg sm:text-xl tabular-nums leading-none ${
        accent ? "text-mineral-200" : "text-ink-50"
      }`}
    >
      {value}
    </p>
  </div>
);

export default HistorySessionPage;
