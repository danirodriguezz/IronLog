"use client";

import { useState } from "react";
import type { HeatmapDay } from "../actions";

type Props = { data: HeatmapDay[] };

type Cell = { date: string; count: number; isToday: boolean; isFuture: boolean };

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT_PAD = 26;
const TOP_PAD = 20;

const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const INTENSITY_FILL = [
  "var(--color-ink-700)",
  "color-mix(in oklab, var(--color-mineral-700) 65%, transparent)",
  "var(--color-mineral-600)",
  "var(--color-mineral-500)",
  "var(--color-mineral-400)",
];

const cellFill = (count: number, isFuture: boolean): string => {
  if (isFuture) return "transparent";
  return INTENSITY_FILL[Math.min(count, 4)];
};

const buildGrid = (data: HeatmapDay[]): Cell[][] => {
  const counts = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);

  const weeks: Cell[][] = [];
  const cur = new Date(start);

  for (let w = 0; w < 53; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().slice(0, 10);
      week.push({
        date: iso,
        count: counts.get(iso) ?? 0,
        isToday: cur.getTime() === today.getTime(),
        isFuture: cur > today,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
};

const formatCellDate = (iso: string): string =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const Heatmap = ({ data }: Props): React.ReactElement => {
  const weeks = buildGrid(data);
  const [hovered, setHovered] = useState<Cell | null>(null);

  const W = LEFT_PAD + weeks.length * STEP - GAP + 2;
  const H = TOP_PAD + 7 * STEP - GAP + 2;

  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const m = new Date(week[0].date + "T12:00:00").getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      if (col < weeks.length - 2) monthLabels.push({ col, label: MONTHS_ES[m] });
    }
  });

  return (
    <div>
      <div className="overflow-x-auto overflow-y-hidden -mx-1 px-1">
        <svg
          width={W}
          height={H}
          role="img"
          aria-label="Mapa de consistencia de entrenamientos del último año"
        >
          {monthLabels.map(({ col, label }) => (
            <text
              key={`m-${col}`}
              x={LEFT_PAD + col * STEP}
              y={12}
              fill="var(--color-ink-300)"
              fontSize={9}
              fontFamily="var(--font-mono)"
              letterSpacing="0.08em"
            >
              {label.toUpperCase()}
            </text>
          ))}

          {[0, 2, 4].map((d) => (
            <text
              key={`day-${d}`}
              x={LEFT_PAD - 5}
              y={TOP_PAD + d * STEP + CELL - 1}
              fill="var(--color-ink-400)"
              fontSize={8}
              fontFamily="var(--font-mono)"
              textAnchor="end"
            >
              {DAYS_ES[d].slice(0, 2).toUpperCase()}
            </text>
          ))}

          {weeks.flatMap((week, col) =>
            week.map((cell, row) => (
              <rect
                key={cell.date}
                x={LEFT_PAD + col * STEP}
                y={TOP_PAD + row * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                fill={cellFill(cell.count, cell.isFuture)}
                stroke={cell.isToday ? "var(--color-mineral-400)" : "none"}
                strokeWidth={1.5}
                style={{ cursor: cell.isFuture ? "default" : "pointer" }}
                onMouseEnter={() => !cell.isFuture && setHovered(cell)}
                onMouseLeave={() => setHovered(null)}
              />
            )),
          )}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="h-4 font-mono text-[10px] text-ink-300 tabular-nums">
          {hovered && !hovered.isFuture ? (
            <>
              <span className="capitalize">{formatCellDate(hovered.date)}</span>
              {" — "}
              {hovered.count === 0
                ? "Sin entreno"
                : `${hovered.count} sesión${hovered.count > 1 ? "es" : ""}`}
            </>
          ) : null}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-400">Menos</span>
          {INTENSITY_FILL.map((fill, i) => (
            <span
              key={i}
              className="block h-2.25 w-2.25 rounded-[2px]"
              style={{ background: fill }}
            />
          ))}
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-400">Más</span>
        </div>
      </div>
    </div>
  );
};
