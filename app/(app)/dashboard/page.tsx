import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDayLongLabel } from "@/lib/week";
import { StatCard } from "./_components/stat-card";

type NextRoutine = { id: string; name: string; day_of_week: number | null };

type PrSet = {
  created_at: string;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  exercises: { name: string; type: "strength" | "cardio" | "isometric" | "bodyweight" } | null;
};

type VolumeSet = { reps: number | null; weight_kg: number | null };

const isoToday = (): number => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

const startOfIsoWeek = (ref: Date = new Date()): Date => {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const iso = isoToday();
  d.setDate(d.getDate() - (iso - 1));
  return d;
};

const formatKg = (n: number): string =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);

const formatMetersToKm = (meters: number): string => {
  const km = meters / 1000;
  return new Intl.NumberFormat("es-ES", { 
    maximumFractionDigits: 2,
    minimumFractionDigits: 0 
  }).format(km);
};
const formatPr = (s: PrSet): { headline: string; hint: string } | null => {
  const ex = s.exercises;
  if (!ex) return null;
  const when = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(
    new Date(s.created_at),
  );
  switch (ex.type) {
    case "strength":
      if (s.weight_kg == null) return null;
      return {
        headline: `${formatKg(Number(s.weight_kg))} kg`,
        hint: `${ex.name}${s.reps ? ` · ${s.reps} reps` : ""} · ${when}`,
      };
    case "bodyweight":
      if (s.reps == null) return null;
      return { headline: `${s.reps} reps`, hint: `${ex.name} · ${when}` };
    case "isometric":
      if (s.duration_seconds == null) return null;
      return {
        headline: `${s.duration_seconds}s`,
        hint: `${ex.name} · ${when}`,
      };
    case "cardio":
      if (s.distance_meters == null) return null;
      return {
        headline: `${formatMetersToKm(s.distance_meters)} km`,
        hint: `${ex.name} · ${when}`,
      };
  }
};

const pickNextRoutine = (
  routines: NextRoutine[],
  today: number,
): { routine: NextRoutine; label: string } | null => {
  const todays = routines.find((r) => r.day_of_week === today);
  if (todays) return { routine: todays, label: "Hoy" };
  const withDay = routines
    .filter((r): r is NextRoutine & { day_of_week: number } => r.day_of_week != null)
    .sort((a, b) => {
      const da = ((a.day_of_week - today + 7) % 7) || 7;
      const db = ((b.day_of_week - today + 7) % 7) || 7;
      return da - db;
    });
  if (withDay[0]) return { routine: withDay[0], label: getDayLongLabel(withDay[0].day_of_week) };
  if (routines[0]) return { routine: routines[0], label: "Sin día" };
  return null;
};

const DashboardPage = async (): Promise<React.ReactElement> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    ((user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]) ??
    user?.email?.split("@")[0] ??
    "Atleta";

  const today = isoToday();
  const weekStartIso = startOfIsoWeek().toISOString();

  const [routinesRes, prRes, volumeRes] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, day_of_week")
      .returns<NextRoutine[]>(),
    supabase
      .from("sets")
      .select(
        "created_at, reps, weight_kg, duration_seconds, distance_meters, exercises(name, type)",
      )
      .eq("is_pr", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<PrSet>(),
    supabase
      .from("sets")
      .select("reps, weight_kg, exercises!inner(type)")
      .eq("exercises.type", "strength")
      .gte("created_at", weekStartIso)
      .returns<VolumeSet[]>(),
  ]);

  const next = pickNextRoutine(routinesRes.data ?? [], today);
  const pr = prRes.data ? formatPr(prRes.data) : null;
  const volumeKg = (volumeRes.data ?? []).reduce(
    (acc, s) => acc + (Number(s.weight_kg) || 0) * (s.reps ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <section className="space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
          Sesión iniciada
        </p>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.98] tracking-tight">
          Hola, <em className="not-italic text-mineral-200">{firstName}</em>.
        </h1>
        <p className="max-w-xl text-ink-200 text-lg">
          Un vistazo a tu semana: lo que toca, tu último récord y el volumen acumulado.
        </p>
      </section>

      <section
        aria-label="Resumen"
        className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {next ? (
          <Link href="/entrenar" className="block">
            <StatCard
              eyebrow={`Próxima rutina · ${next.label}`}
              headline={next.routine.name}
              hint={
                next.routine.day_of_week
                  ? `Programada para ${getDayLongLabel(next.routine.day_of_week).toLowerCase()}.`
                  : "Sin día asignado. Puedes iniciarla igualmente."
              }
            />
          </Link>
        ) : (
          <StatCard
            eyebrow="Próxima rutina"
            headline="Sin programar"
            hint="Crea tu primera rutina para empezar a registrar sesiones."
          />
        )}

        <StatCard
          eyebrow="Último PR"
          headline={pr?.headline ?? "—"}
          hint={
            pr?.hint ??
            "Tus récords personales aparecerán aquí en cuanto logues tu primer set."
          }
        />

        <StatCard
          eyebrow="Volumen semanal"
          headline={`${formatKg(volumeKg)} kg`}
          hint={
            volumeKg > 0
              ? "Tonelaje total de tus series de fuerza esta semana."
              : "Sumamos el tonelaje total de todas las series que completes."
          }
        />
      </section>

      <section className="mt-16">
        <div className="hairline rounded-2xl bg-ink-900/40 p-8 md:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">
            Siguiente paso
          </p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl leading-tight">
            {next ? "Ve al entreno." : "Diseña tu primera rutina."}
          </h2>
          <p className="mt-3 max-w-xl text-ink-200">
            {next
              ? "Tu rutina te espera. Abre el panel de entreno para empezar o continuar donde lo dejaste."
              : "Empieza por un split sencillo. Podrás ajustarla sobre la marcha y cada sesión quedará registrada."}
          </p>
          <Link
            href={next ? "/entrenar" : "/rutinas"}
            className="mt-6 inline-flex items-center rounded-full bg-mineral-300 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-950 transition-colors hover:bg-mineral-200"
          >
            {next ? "Ir a entrenar →" : "Crear rutina →"}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
