"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  Hash,
  Trash2,
  StickyNote,
  Plus,
  CheckCircle2,
} from "lucide-react";
import {
  generateRoutinePlan,
  applyAIRoutinePlan,
  type AIRoutinePlan,
  type CatalogEntry,
  type ApplyStats,
} from "../ai-actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "preview"; plan: AIRoutinePlan; catalog: CatalogEntry[] }
  | { kind: "applying" }
  | { kind: "done"; stats: ApplyStats }
  | { kind: "error"; message: string };

type Props = {
  routineCount?: number;
  routineId?: string;
};

// ── Kind helpers ──────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  increase_weight: "Subir peso",
  decrease_weight: "Bajar peso",
  change_reps: "Cambiar reps",
  change_sets: "Cambiar series",
  add_note: "Añadir nota",
  remove: "Eliminar ejercicio",
};

const KIND_COLOR: Record<string, string> = {
  increase_weight: "text-mineral-300",
  decrease_weight: "text-amber-300",
  change_reps: "text-amber-300",
  change_sets: "text-amber-300",
  add_note: "text-ink-300",
  remove: "text-ember-400",
};

const KindIcon = ({ kind }: { kind: string }): React.ReactElement => {
  const cls = `shrink-0 ${KIND_COLOR[kind] ?? "text-ink-300"}`;
  switch (kind) {
    case "increase_weight": return <ArrowUp size={13} className={cls} />;
    case "decrease_weight": return <ArrowDown size={13} className={cls} />;
    case "change_reps": return <Hash size={13} className={cls} />;
    case "change_sets": return <Hash size={13} className={cls} />;
    case "add_note": return <StickyNote size={13} className={cls} />;
    case "remove": return <Trash2 size={13} className={cls} />;
    default: return <Hash size={13} className={cls} />;
  }
};

const proposedSummary = (proposed: AIRoutinePlan["modifications"][number]["proposed"]): string => {
  const parts: string[] = [];
  if (proposed.target_weight_kg != null) parts.push(`${proposed.target_weight_kg}kg`);
  if (proposed.target_reps != null) parts.push(`${proposed.target_reps} reps`);
  if (proposed.target_sets != null) parts.push(`${proposed.target_sets} series`);
  if (proposed.target_duration_seconds != null) parts.push(`${proposed.target_duration_seconds}s`);
  if (proposed.notes) parts.push(`"${proposed.notes}"`);
  return parts.join(" · ");
};

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ── Spinner ───────────────────────────────────────────────────────────────────

const Spinner = (): React.ReactElement => (
  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ── Skeleton (loading state) ──────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Revisando tu historial de entrenos…",
  "Analizando tus rutinas actuales…",
  "Diseñando el plan personalizado…",
  "Calculando ajustes de volumen…",
];

const LoadingState = (): React.ReactElement => {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center gap-3">
        <Spinner />
        <p className="text-sm text-ink-200 transition-all duration-500">{LOADING_MESSAGES[msgIdx]}</p>
      </div>
      <div className="space-y-3">
        {[70, 55, 80].map((w, i) => (
          <div key={i} className="rounded-2xl bg-ink-800/60 p-4 animate-pulse">
            <div className="h-3 rounded bg-ink-700/60" style={{ width: `${w}%` }} />
            <div className="mt-3 space-y-2">
              <div className="h-2.5 rounded bg-ink-700/40 w-full" />
              <div className="h-2.5 rounded bg-ink-700/40 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Plan preview ──────────────────────────────────────────────────────────────

const PlanPreview = ({ plan }: { plan: AIRoutinePlan }): React.ReactElement => {
  // Group modifications and additions by routineId
  // For modifications we need the routineId — we'll infer it from additions grouping
  // Modifications don't carry routineId in the new schema, so show them in a flat "Modificaciones" section
  const hasChanges =
    plan.modifications.length > 0 || plan.additions.length > 0 || plan.newRoutines.length > 0;

  // Group additions by routineId
  const additionsByRoutine = new Map<string, typeof plan.additions>();
  for (const add of plan.additions) {
    const arr = additionsByRoutine.get(add.routineId) ?? [];
    arr.push(add);
    additionsByRoutine.set(add.routineId, arr);
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-xl border-l-2 border-mineral-400/60 bg-mineral-700/10 px-4 py-3.5">
        <p className="text-sm leading-relaxed text-ink-100">{plan.summary}</p>
      </div>

      {!hasChanges && (
        <p className="text-sm text-ink-300 text-center py-4">
          La IA no ha encontrado cambios necesarios para tu objetivo actual.
        </p>
      )}

      {/* Modifications */}
      {plan.modifications.length > 0 && (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 mb-3">
            Modificaciones · {plan.modifications.length}
          </p>
          <ul className="space-y-2">
            {plan.modifications.map((mod, i) => {
              const summary = proposedSummary(mod.proposed);
              return (
                <li
                  key={i}
                  className="hairline rounded-xl bg-ink-800/50 px-4 py-3 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <KindIcon kind={mod.kind} />
                    <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${KIND_COLOR[mod.kind] ?? "text-ink-300"}`}>
                      {KIND_LABELS[mod.kind] ?? mod.kind}
                    </span>
                  </div>
                  <p className="text-[14px] text-ink-50 font-medium">{mod.exerciseName}</p>
                  {summary && (
                    <p className="font-mono text-[11px] text-mineral-300">{summary}</p>
                  )}
                  <p className="text-[12px] text-ink-400 leading-snug">{mod.rationale}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Additions to existing routines */}
      {additionsByRoutine.size > 0 && (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 mb-3">
            Nuevos ejercicios · {plan.additions.length}
          </p>
          <ul className="space-y-2">
            {plan.additions.map((add, i) => (
              <li
                key={i}
                className="hairline rounded-xl bg-ink-800/50 px-4 py-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <Plus size={13} className="shrink-0 text-mineral-300" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mineral-300">
                    Añadir a rutina
                  </span>
                </div>
                <p className="text-[14px] text-ink-50 font-medium">{add.exerciseName}</p>
                {(add.target_sets != null || add.target_reps != null || add.target_weight_kg != null) && (
                  <p className="font-mono text-[11px] text-mineral-300">
                    {[
                      add.target_sets != null && `${add.target_sets} series`,
                      add.target_reps != null && `${add.target_reps} reps`,
                      add.target_weight_kg != null && `${add.target_weight_kg}kg`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <p className="text-[12px] text-ink-400 leading-snug">{add.rationale}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* New routines */}
      {plan.newRoutines.length > 0 && (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 mb-3">
            Nuevas rutinas · {plan.newRoutines.length}
          </p>
          <ul className="space-y-3">
            {plan.newRoutines.map((nr, i) => (
              <li key={i} className="hairline rounded-xl bg-ink-800/50 px-4 py-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-full bg-mineral-700/30 text-mineral-300 border border-mineral-400/20">
                    Nueva
                  </span>
                  <p className="text-[15px] text-ink-50 font-display leading-tight">{nr.name}</p>
                  {nr.day_of_week != null && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-ink-700/60 text-ink-300 border border-ink-600/40">
                      {DAY_LABELS[nr.day_of_week - 1]}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-ink-400 leading-snug">{nr.rationale}</p>
                {nr.exercises.length > 0 && (
                  <ul className="space-y-1 pl-2 border-l border-ink-700/60">
                    {nr.exercises.map((ex, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-ink-400 tabular-nums">
                          {String(j + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[13px] text-ink-200">{ex.exerciseName}</span>
                        {(ex.target_sets != null || ex.target_reps != null) && (
                          <span className="font-mono text-[10px] text-ink-400">
                            {[
                              ex.target_sets != null && `${ex.target_sets}s`,
                              ex.target_reps != null && `${ex.target_reps}r`,
                              ex.target_weight_kg != null && `${ex.target_weight_kg}kg`,
                            ]
                              .filter(Boolean)
                              .join("×")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

// ── Done state ────────────────────────────────────────────────────────────────

const DoneState = ({ stats, onClose }: { stats: ApplyStats; onClose: () => void }): React.ReactElement => {
  const lines: string[] = [];
  if (stats.modified > 0) lines.push(`${stats.modified} ejercicio${stats.modified > 1 ? "s" : ""} modificado${stats.modified > 1 ? "s" : ""}`);
  if (stats.removed > 0) lines.push(`${stats.removed} eliminado${stats.removed > 1 ? "s" : ""}`);
  if (stats.added > 0) lines.push(`${stats.added} añadido${stats.added > 1 ? "s" : ""}`);
  if (stats.created > 0) lines.push(`${stats.created} rutina${stats.created > 1 ? "s" : ""} creada${stats.created > 1 ? "s" : ""}`);

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-mineral-700/20 ring-1 ring-mineral-400/30">
        <CheckCircle2 size={26} className="text-mineral-300" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-xl leading-tight">Plan aplicado.</p>
        {lines.length > 0 && (
          <p className="text-sm text-ink-200">{lines.join(", ")}.</p>
        )}
        {stats.unresolved.length > 0 && (
          <p className="mt-2 text-[12px] text-amber-300">
            No se encontraron en el catálogo: {stats.unresolved.join(", ")}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 h-11 rounded-md bg-ink-50 px-8 text-sm font-medium text-ink-950 transition-all hover:scale-[1.01] active:scale-[0.99]"
      >
        Cerrar
      </button>
    </div>
  );
};

// ── Dialog content ────────────────────────────────────────────────────────────

type DialogContentProps = {
  titleId: string;
  routineId?: string;
  onClose: () => void;
};

const DialogContent = ({ titleId, routineId, onClose }: DialogContentProps): React.ReactElement => {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [lastObjective, setLastObjective] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && phase.kind !== "loading" && phase.kind !== "applying") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, phase.kind]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const objective = String(new FormData(e.currentTarget).get("objective") ?? "").trim();
    if (!objective) return;
    setLastObjective(objective);
    setPhase({ kind: "loading" });

    const result = await generateRoutinePlan(objective, routineId);

    if (!result.ok) {
      const messages: Record<string, string> = {
        unauthenticated: "Tu sesión ha expirado. Recarga la página.",
        no_routines: "No tienes rutinas creadas. Crea al menos una rutina antes de usar esta función.",
        error: "No se pudo conectar con la IA. Comprueba tu conexión e inténtalo de nuevo.",
      };
      setPhase({ kind: "error", message: messages[result.reason] ?? messages.error });
      return;
    }

    setPhase({ kind: "preview", plan: result.plan, catalog: result.catalogSnapshot });
  };

  const handleApply = async (plan: AIRoutinePlan, catalog: CatalogEntry[]): Promise<void> => {
    setPhase({ kind: "applying" });
    const result = await applyAIRoutinePlan(plan, catalog);

    if (!result.ok) {
      setPhase({ kind: "error", message: result.reason });
      return;
    }

    setPhase({ kind: "done", stats: result.stats });
  };

  const totalChanges =
    phase.kind === "preview"
      ? phase.plan.modifications.length + phase.plan.additions.length + phase.plan.newRoutines.length
      : 0;

  const isBlockingPhase = phase.kind === "loading" || phase.kind === "applying";

  return (
    <div
      className="fixed inset-0 z-100 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={isBlockingPhase ? undefined : onClose}
        className={`absolute inset-0 backdrop-blur-sm animate-[fadeInUp_.2s_ease-out] ${
          isBlockingPhase ? "cursor-default bg-ink-950/80" : "cursor-default bg-ink-950/70"
        }`}
      />

      <div className="relative w-full max-w-2xl rounded-t-2xl sm:rounded-2xl bg-ink-900/95 shadow-[--shadow-card] backdrop-blur-md hairline animate-[fadeInUp_.3s_var(--ease-spring)] flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-5 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mineral-400 shadow-[0_0_8px_var(--color-mineral-400)]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mineral-300">
                IA · Rutinas
              </p>
            </div>
            <h2 id={titleId} className="mt-2 font-display text-2xl leading-tight">
              {routineId ? "Optimiza esta rutina." : "Adapta tu semana."}
            </h2>
          </div>
          {!isBlockingPhase && (
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-ink-800/80 hover:text-ink-50 focus:outline-none focus:ring-1 focus:ring-mineral-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 pb-6 flex-1">
          {phase.kind === "idle" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="ai-objective" className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
                  Tu objetivo
                </label>
                <textarea
                  ref={textareaRef}
                  id="ai-objective"
                  name="objective"
                  rows={4}
                  maxLength={500}
                  placeholder="Ej: quiero enfocarme en definición y perder grasa, reducir el volumen pero mantener la intensidad…"
                  defaultValue={lastObjective}
                  className="w-full rounded-md border border-white/10 bg-ink-800/60 px-4 py-3.5 text-[14px] text-ink-50 outline-none resize-none transition-all placeholder:text-ink-500 hover:border-white/20 focus:border-mineral-400/80 focus:ring-4 focus:ring-mineral-400/10"
                />
                <p className="font-mono text-[10px] text-ink-500">
                  Sé específico: menciona objetivos concretos, limitaciones o cambios que quieras hacer
                </p>
              </div>
              <button
                type="submit"
                className="group relative h-12 w-full overflow-hidden rounded-md bg-ink-50 text-ink-950 font-medium tracking-tight transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                />
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Sparkles size={15} />
                  Analizar y planificar
                </span>
              </button>
            </form>
          )}

          {phase.kind === "loading" && <LoadingState />}

          {phase.kind === "preview" && (
            <PlanPreview plan={phase.plan} />
          )}

          {phase.kind === "applying" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Spinner />
              <p className="text-sm text-ink-200">Aplicando cambios…</p>
            </div>
          )}

          {phase.kind === "done" && (
            <DoneState stats={phase.stats} onClose={onClose} />
          )}

          {phase.kind === "error" && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-ember-500/10 border border-ember-400/20 px-4 py-3.5">
                <p className="text-sm text-ember-300">{phase.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setPhase({ kind: "idle" })}
                className="h-10 w-full rounded-md border border-white/10 bg-ink-800/60 text-sm text-ink-100 transition-colors hover:bg-ink-700/60"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Sticky footer for preview phase */}
        {phase.kind === "preview" && (
          <div className="shrink-0 sticky bottom-0 border-t border-white/8 bg-ink-900/95 backdrop-blur-sm px-6 py-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 shrink-0 rounded-md px-5 text-sm text-ink-200 transition-colors hover:bg-ink-800/60"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => phase.kind === "preview" && handleApply(phase.plan, phase.catalog)}
              disabled={totalChanges === 0}
              className="group relative flex-1 h-11 overflow-hidden rounded-md bg-mineral-600 text-white font-medium text-sm tracking-tight transition-all duration-200 hover:bg-mineral-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                {totalChanges > 0 ? `Aplicar ${totalChanges} cambio${totalChanges > 1 ? "s" : ""}` : "Sin cambios"}
                {totalChanges > 0 && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

export const AIRoutineDialog = ({ routineCount, routineId }: Props): React.ReactElement => {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const isDisabled = routineCount !== undefined && routineCount === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => !isDisabled && setOpen(true)}
        title={isDisabled ? "Crea una rutina primero" : undefined}
        disabled={isDisabled}
        className="hairline inline-flex items-center gap-2 rounded-md bg-ink-900/50 px-4 py-2.5 text-sm text-ink-100 transition-colors hover:bg-ink-800/80 focus:outline-none focus:ring-1 focus:ring-mineral-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles size={14} />
        Modificar con IA
      </button>

      {open && (
        <DialogContent
          titleId={titleId}
          routineId={routineId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
