"use client";

import { useState, useTransition } from "react";
import type {
  ExerciseOption,
  HeatmapDay,
  MuscleGroup,
  ProgressPoint,
  ProgressSummary,
  PrEntry,
} from "../actions";
import { getExerciseProgress } from "../actions";
import { Heatmap } from "./heatmap";
import { MuscleDonut } from "./muscle-donut";
import { PerformanceChart } from "./performance-chart";
import { PrFeed } from "./pr-feed";

type Tab = "resumen" | "rendimiento" | "records";

type Props = {
  summary: ProgressSummary;
  heatmap: HeatmapDay[];
  muscles: MuscleGroup[];
  exercises: ExerciseOption[];
  selectedExercise: ExerciseOption | null;
  progress: ProgressPoint[];
  prFeed: PrEntry[];
};

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "rendimiento", label: "Rendimiento" },
  { id: "records", label: "Muro de Récords" },
];

const formatMinutes = (m: number): string => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min} min`;
  return `${h}h ${min > 0 ? `${min}m` : ""}`.trim();
};

const TYPE_LABEL: Record<ExerciseOption["type"], string> = {
  strength: "Fuerza",
  bodyweight: "Peso corporal",
  isometric: "Isométrico",
  cardio: "Cardio",
};

const TYPE_COLOR: Record<ExerciseOption["type"], string> = {
  strength: "text-mineral-400 bg-mineral-700/30 ring-mineral-700/50",
  bodyweight: "text-mineral-300 bg-mineral-700/20 ring-mineral-700/30",
  isometric: "text-ember-400 bg-ember-500/10 ring-ember-500/20",
  cardio: "text-ember-400 bg-ember-500/10 ring-ember-500/20",
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">{children}</p>
);

const KpiCard = ({
  eyebrow,
  value,
  hint,
}: {
  eyebrow: string;
  value: string;
  hint: string;
}) => (
  <div className="relative overflow-hidden rounded-2xl hairline bg-ink-900/50 p-6">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
    />
    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-400">{eyebrow}</p>
    <p className="mt-4 font-display text-4xl leading-none tracking-tight text-ink-50">{value}</p>
    <p className="mt-3 text-sm text-ink-300">{hint}</p>
  </div>
);

export const ProgressTabs = ({
  summary,
  heatmap,
  muscles,
  exercises,
  selectedExercise,
  progress,
  prFeed,
}: Props): React.ReactElement => {
  const [tab, setTab] = useState<Tab>("resumen");
  const [currentEx, setCurrentEx] = useState<ExerciseOption | null>(selectedExercise);
  const [progressData, setProgressData] = useState<ProgressPoint[]>(progress);
  const [isPending, startTransition] = useTransition();

  const handleSelectExercise = (ex: ExerciseOption) => {
    if (ex.id === currentEx?.id) return;
    setCurrentEx(ex);
    startTransition(async () => {
      const data = await getExerciseProgress(ex.id, ex.type);
      setProgressData(data);
    });
  };

  return (
    <div className="mt-12">
      {/* Tab nav */}
      <div className="border-b border-white/6" role="tablist" aria-label="Secciones de progreso">
        <div className="flex gap-0">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`relative pb-3 pr-6 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mineral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${
                  active ? "text-ink-50" : "text-ink-400 hover:text-ink-200"
                }`}
              >
                {t.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-0 right-6 h-px bg-mineral-400"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RESUMEN ─────────────────────────────── */}
      {tab === "resumen" && (
        <div
          id="panel-resumen"
          role="tabpanel"
          aria-labelledby="tab-resumen"
          className="mt-10 space-y-14"
        >
          {/* KPIs */}
          <section>
            <SectionLabel>Métricas globales</SectionLabel>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard
                eyebrow="Sesiones totales"
                value={String(summary.totalSessions)}
                hint={
                  summary.totalSessions === 0
                    ? "Aún no has registrado ningún entreno."
                    : `${summary.totalSessions} sesión${summary.totalSessions > 1 ? "es" : ""} completada${summary.totalSessions > 1 ? "s" : ""}.`
                }
              />
              <KpiCard
                eyebrow="Tiempo activo"
                value={summary.totalMinutes > 0 ? formatMinutes(summary.totalMinutes) : "—"}
                hint={
                  summary.totalMinutes > 0
                    ? "Tiempo total de entrenamiento registrado."
                    : "Se calcula cuando finalizas las sesiones."
                }
              />
              <KpiCard
                eyebrow="PRs logrados"
                value={String(summary.totalPrs)}
                hint={
                  summary.totalPrs === 0
                    ? "Tus récords personales aparecerán aquí."
                    : `${summary.totalPrs} marca${summary.totalPrs > 1 ? "s" : ""} personal${summary.totalPrs > 1 ? "es" : ""} superada${summary.totalPrs > 1 ? "s" : ""}.`
                }
              />
            </div>
          </section>

          {/* Heatmap */}
          <section>
            <SectionLabel>Consistencia — último año</SectionLabel>
            <p className="mt-1 text-sm text-ink-400">
              Cada celda es un día. El verde más intenso, más sesiones.
            </p>
            <div className="mt-6 rounded-2xl hairline bg-ink-900/30 p-5 md:p-7">
              <Heatmap data={heatmap} />
            </div>
          </section>

          {/* Muscle distribution */}
          <section>
            <SectionLabel>Distribución muscular</SectionLabel>
            <p className="mt-1 text-sm text-ink-400">
              Grupos musculares trabajados en todas tus sesiones.
            </p>
            <div className="mt-6 rounded-2xl hairline bg-ink-900/30 p-5 md:p-7">
              {muscles.length > 0 ? (
                <MuscleDonut data={muscles} />
              ) : (
                <p className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500">
                  Sin datos — registra sesiones para ver tu balance muscular
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── RENDIMIENTO ──────────────────────────── */}
      {tab === "rendimiento" && (
        <div
          id="panel-rendimiento"
          role="tabpanel"
          aria-labelledby="tab-rendimiento"
          className="mt-10 space-y-10"
        >
          {exercises.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="font-display text-2xl text-ink-200">Sin ejercicios todavía</p>
              <p className="max-w-xs text-sm text-ink-400">
                Completa tu primera sesión de entrenamiento para ver el análisis de rendimiento aquí.
              </p>
            </div>
          ) : (
            <>
              {/* Exercise selector */}
              <section>
                <SectionLabel>Seleccionar ejercicio</SectionLabel>
                <div
                  className="mt-4 flex flex-wrap gap-2"
                  role="group"
                  aria-label="Lista de ejercicios"
                >
                  {exercises.map((ex) => {
                    const active = currentEx?.id === ex.id;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => handleSelectExercise(ex)}
                        aria-pressed={active}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mineral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${
                          active
                            ? "bg-mineral-600/30 text-mineral-300 ring-1 ring-mineral-500/50"
                            : "bg-ink-800/50 text-ink-300 ring-1 ring-white/8 hover:bg-ink-700/60 hover:text-ink-100"
                        }`}
                      >
                        {ex.name}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[8px] ring-1 ${TYPE_COLOR[ex.type]}`}
                        >
                          {TYPE_LABEL[ex.type]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Chart */}
              {currentEx && (
                <section>
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-display text-2xl text-ink-50">{currentEx.name}</h2>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ring-1 ${TYPE_COLOR[currentEx.type]}`}>
                      {TYPE_LABEL[currentEx.type]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-400">
                    Evolución de tu rendimiento sesión a sesión.
                  </p>
                  <div className="mt-6 rounded-2xl hairline bg-ink-900/30 p-5 md:p-7">
                    <PerformanceChart
                      points={progressData}
                      exerciseType={currentEx.type}
                      isPending={isPending}
                    />
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MURO DE RÉCORDS ──────────────────────── */}
      {tab === "records" && (
        <div
          id="panel-records"
          role="tabpanel"
          aria-labelledby="tab-records"
          className="mt-10"
        >
          <div className="mb-6 flex items-baseline justify-between">
            <div>
              <SectionLabel>Muro de récords</SectionLabel>
              <p className="mt-1 text-sm text-ink-400">
                Cada vez que rompiste una marca personal, cronológicamente.
              </p>
            </div>
            {prFeed.length > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                {prFeed.length} récord{prFeed.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="rounded-2xl hairline bg-ink-900/30 px-5 py-2 md:px-8">
            <PrFeed entries={prFeed} />
          </div>
        </div>
      )}
    </div>
  );
};
