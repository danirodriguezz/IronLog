import {
  getProgressSummary,
  getHeatmapData,
  getMuscleDistribution,
  getUserExercises,
  getExerciseProgress,
  getPrFeed,
} from "./actions";
import { ProgressTabs } from "./_components/progress-tabs";

type Props = {
  searchParams: Promise<{ ex?: string }>;
};

const ProgresoPage = async ({ searchParams }: Props): Promise<React.ReactElement> => {
  const { ex } = await searchParams;

  const [summary, heatmap, muscles, exercises, prFeed] = await Promise.all([
    getProgressSummary(),
    getHeatmapData(),
    getMuscleDistribution(),
    getUserExercises(),
    getPrFeed(),
  ]);

  const selectedExercise = ex
    ? (exercises.find((e) => e.id === ex) ?? exercises[0] ?? null)
    : (exercises[0] ?? null);

  const progress = selectedExercise
    ? await getExerciseProgress(selectedExercise.id, selectedExercise.type)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <section className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
          Análisis
        </p>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.98] tracking-tight">
          Tu progreso.
        </h1>
        <p className="max-w-xl text-ink-200 text-lg leading-relaxed">
          Datos, tendencias y récords de todos tus entrenamientos.
        </p>
      </section>

      <ProgressTabs
        summary={summary}
        heatmap={heatmap}
        muscles={muscles}
        exercises={exercises}
        selectedExercise={selectedExercise}
        progress={progress}
        prFeed={prFeed}
      />
    </div>
  );
};

export default ProgresoPage;
