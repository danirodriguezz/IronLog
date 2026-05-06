import Link from "next/link";
import type { WeeklyFeedback } from "../ai-actions";

type WeekPlanGridProps = {
  weekPlan: WeeklyFeedback["weekPlan"];
};

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const isoToday = (): number => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

type DayCardProps = {
  dayOfWeek: number;
  focus: string | null;
  advice: string | null;
  routineId: string | null;
  routineName: string | null;
  isToday: boolean;
};

const DayCard = ({
  dayOfWeek,
  focus,
  advice,
  routineId,
  routineName,
  isToday,
}: DayCardProps): React.ReactElement => {
  const isRest = !routineId;
  const shortLabel = DAY_LABELS[dayOfWeek - 1];
  const longLabel = DAY_LONG[dayOfWeek - 1];

  const card = (
    <div
      className={`relative flex flex-col gap-2 rounded-2xl p-4 transition-colors hairline ${
        isToday
          ? "bg-mineral-900/60 ring-1 ring-mineral-400/30"
          : isRest
            ? "bg-ink-900/30"
            : "bg-ink-900/50 hover:bg-ink-900/70"
      }`}
    >
      {isToday && (
        <span className="absolute right-3 top-3 rounded-full bg-mineral-400/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-mineral-300">
          Hoy
        </span>
      )}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
          {shortLabel}
        </p>
        <p className="mt-0.5 text-sm font-medium text-ink-100">{longLabel}</p>
      </div>

      <p
        className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
          isRest ? "text-ink-500" : "text-mineral-400"
        }`}
      >
        {focus ?? "Descanso"}
      </p>

      {routineName && (
        <p className="text-xs text-ink-300">{routineName}</p>
      )}

      <p className="mt-auto text-xs leading-relaxed text-ink-400">{advice ?? "Sin indicaciones para este día."}</p>
    </div>
  );

  if (routineId && !isRest) {
    return (
      <Link href={`/rutinas/${routineId}`} className="block">
        {card}
      </Link>
    );
  }

  return card;
};

export const WeekPlanGrid = ({ weekPlan }: WeekPlanGridProps): React.ReactElement => {
  const today = isoToday();

  const allDays = Array.from({ length: 7 }, (_, i) => {
    const dayNum = i + 1;
    const found = weekPlan.find((d) => d.dayOfWeek === dayNum);
    return {
      dayOfWeek: dayNum,
      routineId: found?.routineId ?? null,
      routineName: found?.routineName ?? null,
      focus: found?.focus ?? "Descanso",
      advice: found?.advice ?? "Sin entreno programado para hoy.",
    };
  });

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300 mb-4">
        Plan de la semana
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {allDays.map((day) => (
          <DayCard
            key={day.dayOfWeek}
            dayOfWeek={day.dayOfWeek}
            focus={day.focus}
            advice={day.advice}
            routineId={day.routineId}
            routineName={day.routineName}
            isToday={day.dayOfWeek === today}
          />
        ))}
      </div>
    </div>
  );
};
