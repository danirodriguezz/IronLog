"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import type { DragEvent } from "react";
import { assignRoutineToDayAction } from "../actions";
import type { WeekDay } from "@/lib/week";
import { CreateRoutineDialog } from "./create-routine-dialog";

export type RoutineCard = {
  id: string;
  name: string;
  description: string | null;
  dayOfWeek: number | null;
  exerciseCount: number;
};

type Props = {
  routines: RoutineCard[];
  week: WeekDay[];
};

type MovePayload = { id: string; day: number | null };

const DRAG_MIME = "application/x-routine-id";

const isoToday = (): number => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

export const WeekBoard = ({ routines, week }: Props): React.ReactElement => {
  const [, startTransition] = useTransition();
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const today = isoToday();

  const [optimisticRoutines, applyMove] = useOptimistic(
    routines,
    (state: RoutineCard[], move: MovePayload) =>
      state.map((r) => {
        if (r.id === move.id) return { ...r, dayOfWeek: move.day };
        if (move.day !== null && r.dayOfWeek === move.day) return { ...r, dayOfWeek: null };
        return r;
      }),
  );

  const unassigned = optimisticRoutines.filter((r) => r.dayOfWeek === null);
  const byDay = (d: number): RoutineCard | undefined =>
    optimisticRoutines.find((r) => r.dayOfWeek === d);

  const submitMove = (routineId: string, day: number | null): void => {
    const fd = new FormData();
    fd.set("routineId", routineId);
    fd.set("day", day === null ? "" : String(day));
    startTransition(() => {
      applyMove({ id: routineId, day });
      void assignRoutineToDayAction(fd);
    });
  };

  const onDragStart = (e: DragEvent<HTMLElement>, routineId: string): void => {
    e.dataTransfer.setData(DRAG_MIME, routineId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(routineId);
  };

  const onDragEnd = (): void => {
    setDraggingId(null);
    setHoveredZone(null);
    dragCounter.current = 0;
  };

  const onDragOver = (e: DragEvent<HTMLElement>): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDragEnter = (zone: string): void => {
    dragCounter.current += 1;
    setHoveredZone(zone);
  };

  const onDragLeave = (): void => {
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setHoveredZone(null);
    }
  };

  const onDrop = (e: DragEvent<HTMLElement>, day: number | null): void => {
    e.preventDefault();
    dragCounter.current = 0;
    setHoveredZone(null);
    setDraggingId(null);
    const routineId = e.dataTransfer.getData(DRAG_MIME);
    if (!routineId) return;
    const current = optimisticRoutines.find((r) => r.id === routineId);
    if (!current) return;
    if (current.dayOfWeek === day) return;
    submitMove(routineId, day);
  };

  const isDragging = draggingId !== null;

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
            Semana en curso
          </h2>
          <p className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Arrastra · o usa el menú
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
          {week.map((w) => {
            const routine = byDay(w.day);
            const zone = `day-${w.day}`;
            const isHot = hoveredZone === zone;
            const isToday = w.day === today;

            return (
              <div
                key={w.day}
                onDragOver={onDragOver}
                onDragEnter={() => onDragEnter(zone)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, w.day)}
                className={[
                  "relative flex flex-col rounded-2xl p-3.5 transition-all duration-200",
                  "min-h-[176px] lg:min-h-[200px]",
                  isHot
                    ? "bg-mineral-700/15 ring-1 ring-mineral-300 shadow-[var(--shadow-glow)]"
                    : isToday
                      ? "bg-ink-900/60 ring-1 ring-mineral-400/30"
                      : "bg-ink-900/40 hairline",
                  isDragging && !isHot ? "opacity-80" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                        isToday ? "text-mineral-300" : "text-ink-300"
                      }`}
                    >
                      {w.shortLabel}
                    </p>
                    {isToday && (
                      <span className="flex h-1.5 w-1.5 rounded-full bg-mineral-400 shadow-[0_0_8px_var(--color-mineral-400)]" />
                    )}
                  </div>
                  <p
                    className={`font-mono tabular-nums text-[11px] ${
                      isToday ? "text-mineral-200" : "text-ink-400"
                    }`}
                  >
                    {String(w.dayOfMonth).padStart(2, "0")}
                  </p>
                </div>

                {routine ? (
                  <RoutineChip
                    routine={routine}
                    onDragStart={(e) => onDragStart(e, routine.id)}
                    onDragEnd={onDragEnd}
                    onUnassign={() => submitMove(routine.id, null)}
                    week={week}
                    onReassign={(d) => submitMove(routine.id, d)}
                    isDragging={draggingId === routine.id}
                    accent={isToday}
                  />
                ) : isHot ? (
                  <div className="mt-auto flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-mineral-300/50 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-300">
                      Soltar aquí
                    </p>
                  </div>
                ) : isDragging ? (
                  <div className="mt-auto flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-600/50 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
                      Descanso
                    </p>
                  </div>
                ) : (
                  <CreateRoutineDialog
                    variant="slot"
                    defaultDayOfWeek={w.day}
                    ariaLabel={`Crear rutina para ${w.longLabel}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
            Sin asignar
          </h2>
          <p className="font-mono tabular-nums text-[10px] uppercase tracking-[0.2em] text-ink-400">
            {String(unassigned.length).padStart(2, "0")} rutina{unassigned.length === 1 ? "" : "s"}
          </p>
        </div>

        <div
          onDragOver={onDragOver}
          onDragEnter={() => onDragEnter("bench")}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, null)}
          className={`mt-5 min-h-[140px] rounded-2xl p-5 transition-all duration-200 ${
            hoveredZone === "bench"
              ? "bg-mineral-700/15 ring-1 ring-mineral-300"
              : "bg-ink-900/30 hairline"
          }`}
        >
          {unassigned.length === 0 ? (
            <div className="flex min-h-[100px] flex-col items-center justify-center gap-2 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
                Todo asignado
              </p>
              <p className="max-w-sm text-sm text-ink-300">
                Suelta aquí una rutina para devolverla al banco.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unassigned.map((r) => (
                <RoutineChip
                  key={r.id}
                  routine={r}
                  variant="bench"
                  onDragStart={(e) => onDragStart(e, r.id)}
                  onDragEnd={onDragEnd}
                  week={week}
                  onReassign={(d) => submitMove(r.id, d)}
                  isDragging={draggingId === r.id}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

type ChipProps = {
  routine: RoutineCard;
  variant?: "day" | "bench";
  onDragStart: (e: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onUnassign?: () => void;
  onReassign: (day: number) => void;
  week: WeekDay[];
  isDragging?: boolean;
  accent?: boolean;
};

const RoutineChip = ({
  routine,
  variant = "day",
  onDragStart,
  onDragEnd,
  onUnassign,
  onReassign,
  week,
  isDragging,
  accent,
}: ChipProps): React.ReactElement => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "group relative mt-3 cursor-grab rounded-[14px] p-3 transition-all duration-150 active:cursor-grabbing",
        variant === "day"
          ? accent
            ? "bg-gradient-to-br from-mineral-700/25 to-ink-950/80 ring-1 ring-mineral-400/25"
            : "bg-ink-950/70 hairline hover:ring-1 hover:ring-ink-500"
          : "bg-ink-950/60 hairline hover:ring-1 hover:ring-ink-500",
        isDragging ? "opacity-40 scale-[0.98]" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/rutinas/${routine.id}`}
          className="min-w-0 flex-1 font-display text-[15px] leading-tight tracking-tight line-clamp-2 hover:text-mineral-200"
        >
          {routine.name}
        </Link>
        <ChipMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          routine={routine}
          week={week}
          onReassign={onReassign}
          onUnassign={onUnassign}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex h-1 w-1 rounded-full ${
            accent ? "bg-mineral-300" : "bg-ink-400"
          }`}
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-300">
          {routine.exerciseCount} ej.
        </p>
      </div>
    </div>
  );
};

type MenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: RoutineCard;
  week: WeekDay[];
  onReassign: (day: number) => void;
  onUnassign?: () => void;
};

const ChipMenu = ({
  open,
  onOpenChange,
  routine,
  week,
  onReassign,
  onUnassign,
}: MenuProps): React.ReactElement => {
  const close = (): void => onOpenChange(false);

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        aria-label="Mover rutina"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(!open);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        draggable={false}
        className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800/80 hover:text-ink-100 focus:outline-none focus:ring-1 focus:ring-mineral-300"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-8 z-50 w-44 origin-top-right rounded-xl bg-ink-900/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-md hairline"
          >
            <p className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-400">
              Mover a
            </p>
            {week.map((w) => {
              const active = routine.dayOfWeek === w.day;
              return (
                <button
                  key={w.day}
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!active) onReassign(w.day);
                    close();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                    active
                      ? "bg-mineral-700/20 text-mineral-200"
                      : "text-ink-100 hover:bg-ink-800/80"
                  }`}
                >
                  <span>{w.longLabel}</span>
                  {active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5 12l5 5L20 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
            {onUnassign && routine.dayOfWeek !== null && (
              <>
                <div className="my-1 h-px bg-ink-700/60" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUnassign();
                    close();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ember-400 transition-colors hover:bg-ember-500/10"
                >
                  Quitar del día
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
