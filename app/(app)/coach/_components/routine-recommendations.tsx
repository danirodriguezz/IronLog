"use client";

import { useTransition } from "react";
import { Check, ArrowUp, ArrowDown, RefreshCw, Trash2, StickyNote, Hash } from "lucide-react";
import { applyRoutineRecommendation, type WeeklyFeedback } from "../ai-actions";

type RoutineRecommendationsProps = {
  insightId: string;
  recommendations: WeeklyFeedback["routineRecommendations"];
  applied: number[];
};

const KIND_LABELS: Record<string, string> = {
  increase_weight: "Subir peso",
  decrease_weight: "Bajar peso",
  change_reps: "Cambiar reps",
  change_sets: "Cambiar series",
  replace_exercise: "Cambiar ejercicio",
  remove: "Eliminar ejercicio",
  add_note: "Añadir nota",
};

const KindIcon = ({ kind }: { kind: string }): React.ReactElement => {
  switch (kind) {
    case "increase_weight": return <ArrowUp size={13} />;
    case "decrease_weight": return <ArrowDown size={13} />;
    case "change_reps": return <Hash size={13} />;
    case "change_sets": return <Hash size={13} />;
    case "replace_exercise": return <RefreshCw size={13} />;
    case "remove": return <Trash2 size={13} />;
    case "add_note": return <StickyNote size={13} />;
    default: return <RefreshCw size={13} />;
  }
};

const proposedSummary = (rec: WeeklyFeedback["routineRecommendations"][number]): string => {
  const p = rec.proposed;
  const parts: string[] = [];
  if (p.target_weight_kg != null) parts.push(`${p.target_weight_kg} kg`);
  if (p.target_reps != null) parts.push(`${p.target_reps} reps`);
  if (p.target_sets != null) parts.push(`${p.target_sets} series`);
  if (p.target_duration_seconds != null) parts.push(`${p.target_duration_seconds}s`);
  if (p.notes) parts.push(`"${p.notes}"`);
  return parts.join(" · ");
};

type RecommendationItemProps = {
  insightId: string;
  rec: WeeklyFeedback["routineRecommendations"][number];
  index: number;
  isApplied: boolean;
};

const RecommendationItem = ({
  insightId,
  rec,
  index,
  isApplied,
}: RecommendationItemProps): React.ReactElement => {
  const [isPending, startTransition] = useTransition();

  const handleApply = (): void => {
    startTransition(async () => {
      await applyRoutineRecommendation(insightId, index);
    });
  };

  const summary = proposedSummary(rec);
  const isManual = rec.kind === "replace_exercise" || rec.kind === "remove";

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl p-4 transition-colors hairline ${
        isApplied ? "bg-mineral-900/30 opacity-60" : "bg-ink-900/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-full bg-ink-700 p-1.5 text-ink-300">
          <KindIcon kind={rec.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mineral-400">
              {KIND_LABELS[rec.kind] ?? rec.kind}
            </span>
            {isApplied && (
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-mineral-300">
                <Check size={10} />
                Aplicado
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-ink-100">{rec.exerciseName}</p>
          {summary && (
            <p className="mt-0.5 font-mono text-[11px] text-ink-300">{summary}</p>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">{rec.rationale}</p>

      {!isApplied && (
        <div className="flex items-center gap-3">
          {isManual ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              Aplicar manualmente en /rutinas
            </p>
          ) : (
            <button
              onClick={handleApply}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-mineral-300 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-950 transition-all hover:bg-mineral-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                "Aplicando…"
              ) : (
                <>
                  <Check size={11} />
                  Aplicar
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const RoutineRecommendations = ({
  insightId,
  recommendations,
  applied,
}: RoutineRecommendationsProps): React.ReactElement => {
  if (recommendations.length === 0) {
    return (
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300 mb-4">
          Cambios en rutinas
        </p>
        <div className="rounded-2xl hairline bg-ink-900/40 p-6 text-center">
          <p className="text-sm text-ink-400">
            El entrenador no sugiere cambios esta semana. Sigue con el plan actual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300 mb-4">
        Cambios en rutinas
      </p>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <RecommendationItem
            key={`${rec.routineExerciseId}-${i}`}
            insightId={insightId}
            rec={rec}
            index={i}
            isApplied={applied.includes(i)}
          />
        ))}
      </div>
    </div>
  );
};
