import type { PrEntry } from "../actions";

type Props = { entries: PrEntry[] };

const formatValue = (e: PrEntry): string => {
  switch (e.exerciseType) {
    case "strength":
      return e.weight_kg != null
        ? `${e.weight_kg} kg${e.reps != null ? ` × ${e.reps} reps` : ""}`
        : "—";
    case "bodyweight":
      return e.reps != null ? `${e.reps} reps` : "—";
    case "isometric":
      return e.duration_seconds != null ? `${e.duration_seconds} s` : "—";
    case "cardio":
      return e.distance_meters != null ? `${e.distance_meters} m` : "—";
  }
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

const TYPE_LABEL: Record<PrEntry["exerciseType"], string> = {
  strength: "Fuerza",
  bodyweight: "Peso corporal",
  isometric: "Isométrico",
  cardio: "Cardio",
};

const PrRow = ({ entry }: { entry: PrEntry }): React.ReactElement => (
  <article className="group relative flex items-start gap-5 py-5">
    {/* Timeline connector */}
    <div className="relative flex flex-col items-center" aria-hidden>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mineral-700/40 ring-1 ring-mineral-500/40">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 1L6.12 3.62L9 4.11L6.95 6.08L7.45 9L5 7.62L2.55 9L3.05 6.08L1 4.11L3.88 3.62L5 1Z"
            fill="var(--color-mineral-400)"
          />
        </svg>
      </div>
    </div>

    <div className="flex-1 min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
        {formatDate(entry.date)}
        <span className="mx-2 text-ink-600">·</span>
        {TYPE_LABEL[entry.exerciseType]}
      </p>
      <p className="mt-1 truncate text-[15px] font-medium text-ink-100">{entry.exerciseName}</p>
    </div>

    <div className="shrink-0 text-right">
      <p className="font-display text-xl leading-none text-mineral-300">{formatValue(entry)}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-mineral-600">
        Récord personal
      </p>
    </div>
  </article>
);

export const PrFeed = ({ entries }: Props): React.ReactElement => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 ring-1 ring-white/8">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
          </svg>
        </div>
        <p className="font-display text-2xl text-ink-100">Sin récords todavía</p>
        <p className="max-w-xs text-sm text-ink-300">
          Cuando superes una marca personal, aparecerá aquí para siempre.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="absolute left-2.75 top-0 bottom-0 w-px"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--color-ink-700) 10%, var(--color-ink-700) 90%, transparent)",
        }}
        aria-hidden
      />
      <div className="divide-y divide-white/4" role="list" aria-label="Historial de récords personales">
        {entries.map((e) => (
          <PrRow key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
};
