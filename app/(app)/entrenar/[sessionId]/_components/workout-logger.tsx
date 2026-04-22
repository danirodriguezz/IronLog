"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  discardSessionAction,
  finishSessionAction,
  saveDraftAction,
  type DraftSet,
} from "../../actions";

type ExerciseType = "strength" | "cardio" | "isometric" | "bodyweight";

export type LastPerformanceSet = {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  paceSeconds: number | null;
  isPr: boolean;
};

export type LastPerformance = {
  sessionId: string;
  sessionName: string;
  startedAt: string | null;
  sets: LastPerformanceSet[];
};

type DraftRow = {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  paceSeconds: number | null;
  rpe: number | null;
};

export type LoggerExercise = {
  sessionExerciseId: string;
  exerciseId: string;
  name: string;
  muscle: string | null;
  type: ExerciseType;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSeconds: number | null;
  last: LastPerformance | null;
  draftSets: DraftRow[];
};

type SetState = DraftRow & { id: string; done: boolean };

type ExerciseState = {
  sessionExerciseId: string;
  sets: SetState[];
};

type Props = {
  sessionId: string;
  exercises: LoggerExercise[];
};

const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s_${Math.random().toString(36).slice(2)}`;

const blankSet = (setNumber: number): SetState => ({
  id: uid(),
  setNumber,
  reps: null,
  weightKg: null,
  durationSeconds: null,
  distanceMeters: null,
  paceSeconds: null,
  rpe: null,
  done: false,
});

const initialiseState = (exercises: LoggerExercise[]): ExerciseState[] =>
  exercises.map((ex) => {
    const hasDraft = ex.draftSets.length > 0;
    if (hasDraft) {
      return {
        sessionExerciseId: ex.sessionExerciseId,
        sets: ex.draftSets.map((s) => ({ ...s, id: uid(), done: true })),
      };
    }
    const count = ex.type === "cardio" ? 1 : (ex.targetSets ?? 3);
    return {
      sessionExerciseId: ex.sessionExerciseId,
      sets: Array.from({ length: Math.max(1, count) }, (_, i) => blankSet(i + 1)),
    };
  });

const toDraftSets = (state: ExerciseState[]): DraftSet[] =>
  state.flatMap((ex) =>
    ex.sets
      .filter(
        (s) =>
          s.reps !== null ||
          s.durationSeconds !== null ||
          s.distanceMeters !== null ||
          s.paceSeconds !== null,
      )
      .map((s, idx) => ({
        sessionExerciseId: ex.sessionExerciseId,
        setNumber: idx + 1,
        reps: s.reps,
        weightKg: s.weightKg,
        durationSeconds: s.durationSeconds,
        distanceMeters: s.distanceMeters,
        paceSeconds: s.paceSeconds,
        rpe: s.rpe,
      })),
  );

const hasAnyData = (state: ExerciseState[]): boolean =>
  state.some((ex) =>
    ex.sets.some(
      (s) =>
        s.reps !== null ||
        s.weightKg !== null ||
        s.durationSeconds !== null ||
        s.distanceMeters !== null ||
        s.paceSeconds !== null,
    ),
  );

const validateCardio = (exercises: LoggerExercise[], state: ExerciseState[]): string | null => {
  for (const ex of exercises) {
    if (ex.type !== "cardio") continue;
    const exState = state.find((s) => s.sessionExerciseId === ex.sessionExerciseId);
    if (!exState) continue;
    const incomplete = exState.sets.some(
      (s) =>
        (s.distanceMeters !== null || s.paceSeconds !== null) &&
        (s.distanceMeters === null || s.paceSeconds === null),
    );
    if (incomplete) {
      return `"${ex.name}" requiere km y ritmo en cada serie.`;
    }
  }
  return null;
};

const formatSecondsElapsed = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const WorkoutLogger = ({ sessionId, exercises }: Props): React.ReactElement => {
  const router = useRouter();
  const [state, setState] = useState<ExerciseState[]>(() => initialiseState(exercises));
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [finishing, startFinishTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsed(Date.now() - startedAtRef.current);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const scheduleSave = (): void => {
    dirtyRef.current = true;
    setDirty(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void flushSave();
    }, 1500);
  };

  const flushSave = async (): Promise<void> => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setSavingDraft(true);
    const res = await saveDraftAction(sessionId, toDraftSets(state));
    setSavingDraft(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setError(null);
      setDirty(false);
    }
  };

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === "hidden" && dirtyRef.current) {
        void flushSave();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const updateSet = (
    sessionExerciseId: string,
    setId: string,
    patch: Partial<SetState>,
  ): void => {
    setState((prev) =>
      prev.map((ex) =>
        ex.sessionExerciseId === sessionExerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            }
          : ex,
      ),
    );
    scheduleSave();
  };

  const addSet = (sessionExerciseId: string): void => {
    setState((prev) =>
      prev.map((ex) =>
        ex.sessionExerciseId === sessionExerciseId
          ? { ...ex, sets: [...ex.sets, blankSet(ex.sets.length + 1)] }
          : ex,
      ),
    );
  };

  const removeSet = (sessionExerciseId: string, setId: string): void => {
    setState((prev) =>
      prev.map((ex) =>
        ex.sessionExerciseId === sessionExerciseId
          ? {
              ...ex,
              sets: ex.sets
                .filter((s) => s.id !== setId)
                .map((s, i) => ({ ...s, setNumber: i + 1 })),
            }
          : ex,
      ),
    );
    scheduleSave();
  };

  const onFinish = (): void => {
    if (!hasAnyData(state)) {
      setError("Registra al menos una serie antes de guardar.");
      return;
    }
    const cardioError = validateCardio(exercises, state);
    if (cardioError) {
      setError(cardioError);
      return;
    }
    setError(null);
    startFinishTransition(async () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      dirtyRef.current = false;
      const res = await finishSessionAction(sessionId, toDraftSets(state));
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push(`/entrenar/historial/${sessionId}`);
      router.refresh();
    });
  };

  const totalDone = useMemo(
    () =>
      state.reduce(
        (acc, ex) => acc + ex.sets.filter((s) => s.done && s.reps !== null).length,
        0,
      ),
    [state],
  );

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 2000);
    return () => window.clearTimeout(id);
  }, [flash]);

  return (
    <div className="space-y-6">
      <div className="hairline sticky top-4 z-20 flex items-center justify-between gap-3 rounded-2xl bg-ink-950/85 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-mineral-400 shadow-[0_0_10px_var(--color-mineral-400)]" />
          <p className="font-mono tabular-nums text-sm text-ink-100">{formatSecondsElapsed(elapsed)}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
            {savingDraft ? "Guardando…" : dirty ? "Sin guardar" : "Borrador ok"}
          </p>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
            · {totalDone} series
          </span>
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="hairline rounded-2xl bg-ink-900/40 p-6 text-ink-200">
          Esta rutina no tiene ejercicios. Añádelos desde la página de la rutina para poder
          entrenar.
        </div>
      ) : null}

      <ol className="space-y-5">
        {exercises.map((ex, idx) => {
          const s = state.find((x) => x.sessionExerciseId === ex.sessionExerciseId);
          if (!s) return null;
          return (
            <li key={ex.sessionExerciseId}>
              <ExerciseCard
                index={idx}
                exercise={ex}
                state={s}
                onUpdateSet={updateSet}
                onAddSet={addSet}
                onRemoveSet={removeSet}
              />
            </li>
          );
        })}
      </ol>

      {error ? (
        <div
          role="alert"
          className="hairline rounded-xl bg-ember-500/10 px-4 py-3 text-sm text-ember-400"
        >
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-20 flex flex-col gap-2 rounded-2xl bg-ink-950/85 p-3 backdrop-blur hairline sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setConfirmDiscard(true)}
          className="inline-flex min-h-12 items-center justify-center rounded-full px-5 font-mono text-[11px] uppercase tracking-[0.22em] text-ember-400 transition-colors hover:bg-ember-500/10 focus:outline-none focus:ring-2 focus:ring-ember-500"
        >
          Descartar entreno
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-mineral-300 px-7 font-mono text-[12px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200 focus:outline-none focus:ring-2 focus:ring-mineral-400 focus:ring-offset-2 focus:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {finishing ? "Guardando…" : "Guardar entreno"}
        </button>
      </div>

      {confirmDiscard ? (
        <ConfirmDiscard
          sessionId={sessionId}
          onCancel={() => setConfirmDiscard(false)}
        />
      ) : null}
    </div>
  );
};

type CardProps = {
  index: number;
  exercise: LoggerExercise;
  state: ExerciseState;
  onUpdateSet: (
    sessionExerciseId: string,
    setId: string,
    patch: Partial<SetState>,
  ) => void;
  onAddSet: (sessionExerciseId: string) => void;
  onRemoveSet: (sessionExerciseId: string, setId: string) => void;
};

const ExerciseCard = ({
  index,
  exercise,
  state,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
}: CardProps): React.ReactElement => {
  const [compareOpen, setCompareOpen] = useState(false);
  const usesWeight = exercise.type === "strength";
  const usesReps = exercise.type === "strength" || exercise.type === "bodyweight";
  const usesDuration = exercise.type === "isometric";
  const usesDistance = exercise.type === "cardio";
  const usesPace = exercise.type === "cardio";

  return (
    <article className="hairline rounded-2xl bg-ink-900/50 p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <span className="font-mono text-[11px] tabular-nums text-ink-400 pt-1">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight">{exercise.name}</h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
              {exercise.muscle ?? "—"}
              {exercise.targetReps || exercise.targetWeightKg ? (
                <>
                  {" · objetivo "}
                  {exercise.targetSets ? `${exercise.targetSets}×` : ""}
                  {exercise.targetReps ?? "—"}
                  {exercise.targetWeightKg ? ` · ${exercise.targetWeightKg}kg` : ""}
                </>
              ) : null}
            </p>
          </div>
        </div>
        {exercise.last ? (
          <button
            type="button"
            onClick={() => setCompareOpen((v) => !v)}
            aria-expanded={compareOpen}
            className="shrink-0 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300 transition-colors hover:bg-ink-800/70 hover:text-ink-50"
          >
            {compareOpen ? "Ocultar" : "Última vez"}
          </button>
        ) : null}
      </header>

      {compareOpen && exercise.last ? (
        <div className="mt-4 rounded-xl bg-ink-950/50 p-3 hairline">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-300">
            Última vez · {exercise.last.startedAt ? new Date(exercise.last.startedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : ""}
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {exercise.last.sets.map((s) => (
              <li
                key={s.setNumber}
                className="flex items-center justify-between gap-2 rounded-lg bg-ink-900/60 px-2 py-1.5 font-mono text-[11px] tabular-nums"
              >
                <span className="text-ink-400">#{s.setNumber}</span>
                <span className="text-ink-100">
                  {s.weightKg !== null ? `${s.weightKg}kg` : ""}
                  {s.weightKg !== null && s.reps !== null ? " · " : ""}
                  {s.reps !== null ? `${s.reps}r` : ""}
                  {s.durationSeconds !== null ? `${s.durationSeconds}s` : ""}
                </span>
                {s.isPr ? (
                  <span className="rounded-full bg-mineral-300 px-1.5 text-[9px] uppercase text-ink-950">
                    PR
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl hairline">
        <div className="grid grid-cols-[28px_1fr_1fr_44px_36px] items-center gap-2 bg-ink-950/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
          <span>#</span>
          <span>{usesWeight ? "Kg" : usesDistance ? "Km" : "—"}</span>
          <span>{usesReps ? "Reps" : usesPace ? "Ritmo" : usesDuration ? "Segundos" : "—"}</span>
          <span className="text-center">Ok</span>
          <span />
        </div>

        <ul>
          {state.sets.map((s, i) => {
            const lastRef = exercise.last?.sets[i];
            const metricA = usesWeight
              ? s.weightKg
              : s.distanceMeters !== null
                ? s.distanceMeters / 1000
                : null;
            const metricB = usesReps ? s.reps : s.durationSeconds;
            const placeholderA = usesWeight
              ? lastRef?.weightKg != null
                ? String(lastRef.weightKg)
                : exercise.targetWeightKg != null
                  ? String(exercise.targetWeightKg)
                  : "—"
              : usesDistance
                ? lastRef?.distanceMeters != null
                  ? String(lastRef.distanceMeters / 1000)
                  : "—"
                : "";
            const placeholderB = usesReps
              ? lastRef?.reps != null
                ? String(lastRef.reps)
                : exercise.targetReps != null
                  ? String(exercise.targetReps)
                  : "—"
              : usesDuration
                ? lastRef?.durationSeconds != null
                  ? String(lastRef.durationSeconds)
                  : exercise.targetDurationSeconds != null
                    ? String(exercise.targetDurationSeconds)
                    : "—"
                : "";
            const placeholderPace =
              lastRef?.paceSeconds != null ? formatPace(lastRef.paceSeconds) : "5:00";

            return (
              <li
                key={s.id}
                className={`grid grid-cols-[28px_1fr_1fr_44px_36px] items-center gap-2 border-t border-ink-800/60 px-3 py-2 ${
                  s.done ? "bg-mineral-700/10" : ""
                }`}
              >
                <span className="font-mono text-[11px] tabular-nums text-ink-400">
                  {s.setNumber}
                </span>
                <MetricInput
                  ariaLabel={usesWeight ? "Kilos" : "Km"}
                  value={metricA}
                  placeholder={placeholderA}
                  disabled={!usesWeight && !usesDistance}
                  decimal={usesWeight || usesDistance}
                  onChange={(n) =>
                    onUpdateSet(
                      state.sessionExerciseId,
                      s.id,
                      usesWeight
                        ? { weightKg: n }
                        : { distanceMeters: n !== null ? n * 1000 : null },
                    )
                  }
                />
                {usesPace ? (
                  <PaceInput
                    value={s.paceSeconds}
                    placeholder={placeholderPace}
                    onChange={(n) =>
                      onUpdateSet(state.sessionExerciseId, s.id, { paceSeconds: n })
                    }
                  />
                ) : (
                  <MetricInput
                    ariaLabel={usesReps ? "Repeticiones" : "Segundos"}
                    value={metricB}
                    placeholder={placeholderB}
                    disabled={!usesReps && !usesDuration}
                    onChange={(n) =>
                      onUpdateSet(state.sessionExerciseId, s.id, usesReps ? { reps: n } : { durationSeconds: n })
                    }
                  />
                )}
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    aria-label={s.done ? "Marcar como pendiente" : "Marcar serie completa"}
                    aria-pressed={s.done}
                    onClick={() =>
                      onUpdateSet(state.sessionExerciseId, s.id, { done: !s.done })
                    }
                    className={`grid h-9 w-9 place-items-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-mineral-400 ${
                      s.done
                        ? "bg-mineral-300 text-ink-950"
                        : "bg-ink-900/70 text-ink-400 hover:bg-ink-800 hover:text-ink-100"
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5 12l5 5L20 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={`Eliminar serie ${s.setNumber}`}
                  onClick={() => onRemoveSet(state.sessionExerciseId, s.id)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ember-500/10 hover:text-ember-400 focus:outline-none focus:ring-2 focus:ring-ember-500"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6 6l12 12M6 18L18 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => onAddSet(state.sessionExerciseId)}
          className="flex w-full min-h-11 items-center justify-center gap-2 border-t border-ink-800/60 bg-ink-950/40 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300 transition-colors hover:bg-ink-900/70 hover:text-mineral-200"
        >
          + Añadir serie
        </button>
      </div>
    </article>
  );
};

const formatPace = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const parsePace = (str: string): number | null => {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (
      Number.isFinite(mins) &&
      Number.isFinite(secs) &&
      mins >= 0 &&
      secs >= 0 &&
      secs < 60
    ) {
      return mins * 60 + secs;
    }
  }
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

type PaceInputProps = {
  value: number | null;
  placeholder: string;
  onChange: (value: number | null) => void;
};

const PaceInput = ({ value, placeholder, onChange }: PaceInputProps): React.ReactElement => {
  const [display, setDisplay] = useState(() => (value !== null ? formatPace(value) : ""));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDisplay(value !== null ? formatPace(value) : "");
    }
  }, [value]);

  return (
    <input
      type="text"
      inputMode="text"
      aria-label="Ritmo (min/km)"
      value={display}
      placeholder={placeholder}
      onChange={(e) => setDisplay(e.target.value)}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        const parsed = parsePace(display);
        onChange(parsed);
        setDisplay(parsed !== null ? formatPace(parsed) : "");
      }}
      className="h-10 w-full rounded-lg bg-ink-950/60 px-2.5 text-center font-mono text-[15px] tabular-nums text-ink-50 placeholder:text-ink-500/70 focus:outline-none focus:ring-2 focus:ring-mineral-400"
    />
  );
};

type MetricInputProps = {
  value: number | null;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  decimal?: boolean;
  onChange: (value: number | null) => void;
};

const MetricInput = ({
  value,
  placeholder,
  ariaLabel,
  disabled,
  decimal,
  onChange,
}: MetricInputProps): React.ReactElement => {
  const [display, setDisplay] = useState(() => (value === null ? "" : String(value)));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDisplay(value === null ? "" : String(value));
    }
  }, [value]);

  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      pattern={decimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
      aria-label={ariaLabel}
      disabled={disabled}
      value={display}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        const pattern = decimal ? /^[0-9]*[,.]?[0-9]*$/ : /^[0-9]*$/;
        if (!pattern.test(raw)) return;
        setDisplay(raw);
        const normalized = raw.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          onChange(null);
          return;
        }
        const n = Number(normalized);
        if (Number.isFinite(n) && n >= 0) onChange(n);
      }}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        const normalized = display.replace(",", ".");
        const n = Number(normalized);
        if (normalized === "" || !Number.isFinite(n)) {
          setDisplay(value === null ? "" : String(value));
        } else {
          setDisplay(String(n));
        }
      }}
      className="h-10 w-full rounded-lg bg-ink-950/60 px-2.5 text-center font-mono text-[15px] tabular-nums text-ink-50 placeholder:text-ink-500/70 focus:outline-none focus:ring-2 focus:ring-mineral-400 disabled:bg-transparent disabled:text-ink-600"
    />
  );
};

type ConfirmProps = {
  sessionId: string;
  onCancel: () => void;
};

const ConfirmDiscard = ({ sessionId, onCancel }: ConfirmProps): React.ReactElement => (
  <div
    role="dialog"
    aria-modal="true"
    className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/70 p-4 backdrop-blur sm:items-center"
  >
    <div className="hairline w-full max-w-md rounded-2xl bg-ink-900 p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ember-400">
        Descartar entreno
      </p>
      <h3 className="mt-2 font-display text-2xl leading-tight">¿Seguro?</h3>
      <p className="mt-2 text-sm text-ink-200">
        Se borrarán todas las series que has registrado en este entreno. Esta acción no se
        puede deshacer.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center justify-center rounded-full px-5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-200 transition-colors hover:bg-ink-800"
        >
          Cancelar
        </button>
        <form action={discardSessionAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ember-500 px-5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-950 transition-colors hover:bg-ember-400 sm:w-auto"
          >
            Sí, descartar
          </button>
        </form>
      </div>
    </div>
  </div>
);
