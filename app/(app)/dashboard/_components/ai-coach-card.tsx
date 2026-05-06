import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";
import { getCachedFeedback } from "@/app/(app)/coach/ai-actions";
import { getDayLongLabel } from "@/lib/week";

const scoreColor = (score: number): string => {
  if (score < 4) return "bg-ember-500";
  if (score < 7) return "bg-amber-400";
  return "bg-mineral-400";
};

const scoreLabel = (score: number): string => {
  if (score < 4) return "Baja";
  if (score < 7) return "Media";
  return "Alta";
};

const isoToday = (): number => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

export const AiCoachCard = async (): Promise<React.ReactElement> => {
  const insight = await getCachedFeedback();
  const today = isoToday();

  return (
    <article className="relative overflow-hidden rounded-2xl hairline bg-ink-900/50 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
      />

      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mineral-400">
        AI Coach
      </p>

      {!insight ? (
        <>
          <p className="mt-4 font-display text-3xl leading-none tracking-tight text-ink-50">
            Informe semanal
          </p>
          <p className="mt-4 text-sm text-ink-300">
            Genera tu primer informe personalizado para recibir tu plan de entrenamiento de la semana.
          </p>
          <Link
            href="/coach"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-mineral-300 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200 active:scale-[0.99]"
          >
            <Brain size={13} />
            Ir al coach
          </Link>
        </>
      ) : (
        <>
          {/* Score + motivational */}
          <div className="mt-4 flex items-start gap-4">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 ring-1 ring-white/10">
                <p className={`font-display text-xl leading-none ${scoreColor(insight.feedback.adherenceScore).replace("bg-", "text-")}`}>
                  {insight.feedback.adherenceScore}
                </p>
              </div>
              <p className="mt-1 text-center font-mono text-[9px] text-ink-500">
                {scoreLabel(insight.feedback.adherenceScore)}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-ink-100 line-clamp-3">
                {insight.feedback.motivationalMessage}
              </p>
            </div>
          </div>

          {/* Adherence bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
                Consistencia
              </p>
              <span className="font-mono text-[10px] text-ink-300">
                {insight.feedback.adherenceScore}/10
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
              <div
                className={`h-full rounded-full transition-all duration-700 ${scoreColor(insight.feedback.adherenceScore)}`}
                style={{ width: `${insight.feedback.adherenceScore * 10}%` }}
              />
            </div>
          </div>

          {/* Today's plan highlight */}
          {(() => {
            const todayPlan = insight.feedback.weekPlan.find((d) => d.dayOfWeek === today);
            if (!todayPlan) return null;
            return (
              <div className="mt-5 rounded-xl bg-ink-800/60 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                  Hoy · {getDayLongLabel(today)}
                </p>
                <p className="mt-1 text-sm font-medium text-ink-100">{todayPlan.focus}</p>
                {todayPlan.routineName && (
                  <p className="mt-0.5 font-mono text-[10px] text-mineral-400">{todayPlan.routineName}</p>
                )}
              </div>
            );
          })()}

          {/* CTA */}
          <div className="mt-5">
            <Link
              href="/coach"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-400 transition-colors hover:text-mineral-200"
            >
              Ver informe completo
              <ArrowRight size={11} />
            </Link>
          </div>
        </>
      )}
    </article>
  );
};
