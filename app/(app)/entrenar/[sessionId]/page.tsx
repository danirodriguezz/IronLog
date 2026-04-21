import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutLogger, type LoggerExercise, type LastPerformance } from "./_components/workout-logger";

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
};

type SetRow = {
  id: string;
  session_exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
};

type RoutineTargetRow = {
  exercise_id: string;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_duration_seconds: number | null;
};

const ActiveSessionPage = async ({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<React.ReactElement> => {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, started_at, status, routine_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) notFound();
  if (session.status === "completed" || session.status === "discarded") {
    redirect(`/entrenar/historial/${sessionId}`);
  }

  const [seRes, setsRes] = await Promise.all([
    supabase
      .from("session_exercises")
      .select("id, order_index, exercise_id, exercises(id, name, target_muscle, type)")
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true })
      .returns<SessionExerciseRow[]>(),
    supabase
      .from("sets")
      .select("id, session_exercise_id, set_number, reps, weight_kg, duration_seconds, distance_meters, rpe")
      .in(
        "session_exercise_id",
        (
          await supabase
            .from("session_exercises")
            .select("id")
            .eq("session_id", sessionId)
        ).data?.map((r) => r.id) ?? ["00000000-0000-0000-0000-000000000000"],
      )
      .order("set_number", { ascending: true })
      .returns<SetRow[]>(),
  ]);

  const sessionExercises = seRes.data ?? [];
  const existingSets = setsRes.data ?? [];
  const exerciseIds = sessionExercises.map((r) => r.exercise_id);

  const [targetRes, lastRes] = await Promise.all([
    session.routine_id
      ? supabase
          .from("routine_exercises")
          .select("exercise_id, target_sets, target_reps, target_weight_kg, target_duration_seconds")
          .eq("routine_id", session.routine_id)
          .returns<RoutineTargetRow[]>()
      : Promise.resolve({ data: [] as RoutineTargetRow[] }),
    fetchLastPerformance(supabase, user.id, exerciseIds, sessionId),
  ]);

  const targetByExercise = new Map(
    (targetRes.data ?? []).map((t) => [t.exercise_id, t] as const),
  );

  const exercises: LoggerExercise[] = sessionExercises.map((se) => {
    const ex = se.exercises;
    const target = targetByExercise.get(se.exercise_id);
    const last = lastRes.get(se.exercise_id) ?? null;
    const draftSets = existingSets
      .filter((s) => s.session_exercise_id === se.id)
      .sort((a, b) => a.set_number - b.set_number);
    return {
      sessionExerciseId: se.id,
      exerciseId: se.exercise_id,
      name: ex?.name ?? "—",
      muscle: ex?.target_muscle ?? null,
      type: ex?.type ?? "strength",
      targetSets: target?.target_sets ?? null,
      targetReps: target?.target_reps ?? null,
      targetWeightKg: target?.target_weight_kg ?? null,
      targetDurationSeconds: target?.target_duration_seconds ?? null,
      last,
      draftSets: draftSets.map((s) => ({
        setNumber: s.set_number,
        reps: s.reps,
        weightKg: s.weight_kg,
        durationSeconds: s.duration_seconds,
        distanceMeters: s.distance_meters,
        rpe: s.rpe,
      })),
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 md:py-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/entrenar"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300 transition-colors hover:text-ink-50"
        >
          ← Salir
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-300">
          ● En curso
        </p>
      </div>

      <header className="mt-4 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
          Entrenamiento
        </p>
        <h1 className="font-display text-3xl sm:text-4xl leading-[1.02] tracking-tight">
          {session.name}
        </h1>
      </header>

      <div className="mt-8">
        <WorkoutLogger sessionId={sessionId} exercises={exercises} />
      </div>
    </div>
  );
};

const fetchLastPerformance = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  exerciseIds: string[],
  excludeSessionId: string,
): Promise<Map<string, LastPerformance>> => {
  const result = new Map<string, LastPerformance>();
  if (exerciseIds.length === 0) return result;

  for (const exerciseId of exerciseIds) {
    const { data: last } = await supabase
      .from("session_exercises")
      .select("id, session_id, sessions!inner(id, name, started_at, status)")
      .eq("exercise_id", exerciseId)
      .eq("user_id", userId)
      .eq("sessions.status", "completed")
      .neq("session_id", excludeSessionId)
      .order("sessions(started_at)", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        session_id: string;
        sessions: { id: string; name: string; started_at: string; status: string } | null;
      }>();

    if (!last) continue;

    const { data: sets } = await supabase
      .from("sets")
      .select("set_number, reps, weight_kg, duration_seconds, distance_meters, is_pr")
      .eq("session_exercise_id", last.id)
      .order("set_number", { ascending: true });

    if (!sets || sets.length === 0) continue;

    result.set(exerciseId, {
      sessionId: last.session_id,
      sessionName: last.sessions?.name ?? "—",
      startedAt: last.sessions?.started_at ?? null,
      sets: sets.map((s) => ({
        setNumber: s.set_number,
        reps: s.reps,
        weightKg: s.weight_kg,
        durationSeconds: s.duration_seconds,
        distanceMeters: s.distance_meters,
        isPr: s.is_pr,
      })),
    });
  }

  return result;
};

export default ActiveSessionPage;
