import { getCachedFeedback } from "./ai-actions";
import { CoachHeader } from "./_components/coach-header";
import { WeekPlanGrid } from "./_components/week-plan-grid";
import { OverallReport } from "./_components/overall-report";
import { RoutineRecommendations } from "./_components/routine-recommendations";
import { RefreshFeedbackButton } from "./_components/refresh-feedback-button";

const CoachPage = async (): Promise<React.ReactElement> => {
  const insight = await getCachedFeedback();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <section className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
          AI Coach
        </p>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.98] tracking-tight">
          Tu informe semanal.
        </h1>
        <p className="max-w-xl text-ink-200 text-lg">
          Análisis personalizado basado en tus sesiones, rutinas y objetivos.
        </p>
      </section>

      <div className="mt-12 space-y-10">
        {!insight ? (
          <RefreshFeedbackButton isFirstTime />
        ) : (
          <>
            {/* Header: score + motivational */}
            <section className="rounded-2xl hairline bg-ink-900/50 p-6 md:p-8">
              <CoachHeader insight={insight} />
            </section>

            {/* Overall report + volume + adherence */}
            <section>
              <OverallReport
                report={insight.feedback.overallReport}
                adherenceAnalysis={insight.feedback.adherenceAnalysis}
                volumeAnalysis={insight.feedback.volumeAnalysis}
              />
            </section>

            {/* Week plan */}
            <section>
              <WeekPlanGrid weekPlan={insight.feedback.weekPlan} />
            </section>

            {/* Routine recommendations */}
            <section>
              <RoutineRecommendations
                insightId={insight.id}
                recommendations={insight.feedback.routineRecommendations}
                applied={insight.applied_recommendations}
              />
            </section>

            {/* Refresh button — only shown when stale */}
            {insight.isStale && (
              <section className="flex justify-center">
                <RefreshFeedbackButton />
              </section>
            )}

            {!insight.isStale && (
              <section>
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-600">
                  El informe se actualizará automáticamente pasados 7 días
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CoachPage;
