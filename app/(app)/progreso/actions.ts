"use server";

import { createClient } from "@/lib/supabase/server";

export type ProgressSummary = {
  totalSessions: number;
  totalMinutes: number;
  totalPrs: number;
};

export type HeatmapDay = { date: string; count: number };

export type MuscleGroup = { muscle: string; count: number };

export type ExerciseOption = {
  id: string;
  name: string;
  type: "strength" | "cardio" | "isometric" | "bodyweight";
};

export type ProgressPoint = {
  date: string;
  value: number;
  isPr: boolean;
  rpe: number | null;
  volume: number;
  sessionId: string;
};

export type PrEntry = {
  id: string;
  date: string;
  exerciseName: string;
  exerciseType: "strength" | "cardio" | "isometric" | "bodyweight";
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
};

export const getProgressSummary = async (): Promise<ProgressSummary> => {
  const supabase = await createClient();

  const [{ count: sessions }, { data: timeSessions }, { count: prs }] = await Promise.all([
    supabase.from("sessions").select("*", { count: "exact", head: true }),
    supabase
      .from("sessions")
      .select("started_at, ended_at")
      .not("ended_at", "is", null)
      .returns<{ started_at: string; ended_at: string }[]>(),
    supabase.from("sets").select("*", { count: "exact", head: true }).eq("is_pr", true),
  ]);

  const totalMinutes = (timeSessions ?? []).reduce<number>((acc, s) => {
    return acc + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000;
  }, 0);

  return {
    totalSessions: sessions ?? 0,
    totalMinutes: Math.round(totalMinutes),
    totalPrs: prs ?? 0,
  };
};

export const getHeatmapData = async (): Promise<HeatmapDay[]> => {
  const supabase = await createClient();
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  const { data } = await supabase
    .from("sessions")
    .select("started_at")
    .gte("started_at", cutoff.toISOString())
    .order("started_at")
    .returns<{ started_at: string }[]>();

  const counts: Record<string, number> = {};
  for (const { started_at } of data ?? []) {
    const d = started_at.slice(0, 10);
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return Object.entries(counts).map(([date, count]) => ({ date, count }));
};

export const getMuscleDistribution = async (): Promise<MuscleGroup[]> => {
  const supabase = await createClient();

  type Row = { exercises: { target_muscle: string } | null };
  const { data } = await supabase
    .from("session_exercises")
    .select("exercises!inner(target_muscle)")
    .not("exercises.target_muscle", "is", null)
    .returns<Row[]>();

  const counts: Record<string, number> = {};
  for (const se of data ?? []) {
    const muscle = se.exercises?.target_muscle;
    if (muscle) counts[muscle] = (counts[muscle] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([muscle, count]) => ({ muscle, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
};

export const getUserExercises = async (): Promise<ExerciseOption[]> => {
  const supabase = await createClient();

  const { data: rawIds } = await supabase
    .from("sets")
    .select("exercise_id")
    .returns<{ exercise_id: string }[]>();

  const ids = [...new Set((rawIds ?? []).map((r) => r.exercise_id))];
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("exercises")
    .select("id, name, type")
    .in("id", ids)
    .order("name")
    .returns<ExerciseOption[]>();

  return data ?? [];
};

type RawSet = {
  created_at: string;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  is_pr: boolean;
  rpe: number | null;
  session_exercises: { session_id: string } | null;
};

export const getExerciseProgress = async (
  exerciseId: string,
  exerciseType: ExerciseOption["type"],
): Promise<ProgressPoint[]> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sets")
    .select(
      "created_at, reps, weight_kg, duration_seconds, distance_meters, is_pr, rpe, session_exercises!inner(session_id)",
    )
    .eq("exercise_id", exerciseId)
    .order("created_at")
    .returns<RawSet[]>();

  const bySession: Record<string, { sets: RawSet[]; date: string }> = {};
  for (const s of data ?? []) {
    const sid = (s.session_exercises as { session_id: string } | null)?.session_id;
    if (!sid) continue;
    if (!bySession[sid]) bySession[sid] = { sets: [], date: s.created_at.slice(0, 10) };
    bySession[sid].sets.push(s);
  }

  return Object.entries(bySession).map(([sessionId, { sets, date }]) => {
    const isPr = sets.some((s) => s.is_pr);
    const rpe = sets.reduce<number | null>((max, s) => {
      if (s.rpe == null) return max;
      return max == null ? s.rpe : Math.max(max, s.rpe);
    }, null);

    let value = 0;
    let volume = 0;
    for (const s of sets) {
      switch (exerciseType) {
        case "strength":
          value = Math.max(value, Number(s.weight_kg) || 0);
          volume += (Number(s.weight_kg) || 0) * (s.reps ?? 0);
          break;
        case "bodyweight":
          value = Math.max(value, s.reps ?? 0);
          volume += s.reps ?? 0;
          break;
        case "isometric":
          value = Math.max(value, s.duration_seconds ?? 0);
          volume += s.duration_seconds ?? 0;
          break;
        case "cardio":
          value = Math.max(value, s.distance_meters ?? 0);
          volume += s.distance_meters ?? 0;
          break;
      }
    }

    return { date, value, isPr, rpe, volume, sessionId };
  });
};

export const getPrFeed = async (): Promise<PrEntry[]> => {
  const supabase = await createClient();

  type Raw = {
    id: string;
    created_at: string;
    weight_kg: number | null;
    reps: number | null;
    duration_seconds: number | null;
    distance_meters: number | null;
    exercises: { name: string; type: string } | null;
  };

  const { data } = await supabase
    .from("sets")
    .select("id, created_at, weight_kg, reps, duration_seconds, distance_meters, exercises(name, type)")
    .eq("is_pr", true)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Raw[]>();

  return (data ?? []).map((s) => ({
    id: s.id,
    date: s.created_at,
    exerciseName: s.exercises?.name ?? "Ejercicio",
    exerciseType: (s.exercises?.type ?? "strength") as PrEntry["exerciseType"],
    weight_kg: s.weight_kg,
    reps: s.reps,
    duration_seconds: s.duration_seconds,
    distance_meters: s.distance_meters,
  }));
};
