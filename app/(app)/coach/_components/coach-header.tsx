"use client";

import type { CachedInsight } from "../ai-actions";

type CoachHeaderProps = {
  insight: CachedInsight;
};

const scoreColor = (score: number): string => {
  if (score < 4) return "text-ember-400";
  if (score < 7) return "text-amber-400";
  return "text-mineral-400";
};

const scoreLabel = (score: number): string => {
  if (score < 4) return "Baja";
  if (score < 7) return "Media";
  return "Alta";
};

const scoreBg = (score: number): string => {
  if (score < 4) return "bg-ember-500/15 ring-ember-500/30";
  if (score < 7) return "bg-amber-400/15 ring-amber-400/30";
  return "bg-mineral-400/15 ring-mineral-400/30";
};

export const CoachHeader = ({ insight }: CoachHeaderProps): React.ReactElement => {
  const { feedback, created_at } = insight;
  const score = feedback.adherenceScore;
  const generatedDate = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(created_at));

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      {/* Score circle */}
      <div
        className={`shrink-0 flex h-20 w-20 items-center justify-center rounded-full ring-2 ${scoreBg(score)}`}
      >
        <div className="text-center">
          <p className={`font-display text-3xl leading-none tracking-tight ${scoreColor(score)}`}>
            {score}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">
            /10
          </p>
        </div>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mineral-400">
            AI Coach · Consistencia {scoreLabel(score)}
          </p>
        </div>
        <p className="mt-2 text-lg leading-snug text-ink-100">
          {feedback.motivationalMessage}
        </p>
        <p className="mt-2 font-mono text-[10px] text-ink-500">
          Informe generado el {generatedDate}
        </p>
      </div>
    </div>
  );
};
