"use client";

import { useState } from "react";
import type { MuscleGroup } from "../actions";

type Props = { data: MuscleGroup[] };

const COLORS = [
  "#1eea84",
  "#06cc6b",
  "#4dfaa3",
  "#04a558",
  "#ff8b65",
  "#067f47",
  "#8dffc4",
  "#ff6a3d",
];

const CX = 90;
const CY = 90;
const OUTER_R = 72;
const INNER_R = 48;
const GAP_ANGLE = 1.8;

const polarToXY = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string => {
  const o1 = polarToXY(cx, cy, outerR, startDeg);
  const o2 = polarToXY(cx, cy, outerR, endDeg);
  const i1 = polarToXY(cx, cy, innerR, endDeg);
  const i2 = polarToXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
};

export const MuscleDonut = ({ data }: Props): React.ReactElement => {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-45 items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Sin datos musculares
        </p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  type Slice = {
    start: number;
    end: number;
    color: string;
    muscle: string;
    count: number;
    pct: number;
  };

  const slices = data.reduce<{ list: Slice[]; cursor: number }>(
    ({ list, cursor }, d, i) => {
      const sweep = (d.count / total) * (360 - data.length * GAP_ANGLE);
      return {
        list: [
          ...list,
          {
            start: cursor,
            end: cursor + sweep,
            color: COLORS[i % COLORS.length],
            muscle: d.muscle,
            count: d.count,
            pct: Math.round((d.count / total) * 100),
          },
        ],
        cursor: cursor + sweep + GAP_ANGLE,
      };
    },
    { list: [], cursor: 0 },
  ).list;

  const active = hovered !== null ? slices[hovered] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <svg width={180} height={180} viewBox="0 0 180 180" role="img" aria-label="Distribución muscular">
          {slices.map((s, i) => {
            const isHovered = hovered === i;
            const scale = isHovered ? 1.05 : 1;
            return (
              <path
                key={s.muscle}
                d={arcPath(CX, CY, OUTER_R + (isHovered ? 6 : 0), INNER_R, s.start, s.end)}
                fill={s.color}
                opacity={hovered !== null && !isHovered ? 0.35 : 1}
                style={{
                  cursor: "pointer",
                  transformOrigin: `${CX}px ${CY}px`,
                  transform: `scale(${scale})`,
                  transition: "transform 0.15s ease, opacity 0.15s ease",
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {active ? (
            <>
              <text
                x={CX}
                y={CY - 7}
                textAnchor="middle"
                fill="var(--color-ink-50)"
                fontSize={18}
                fontFamily="var(--font-display)"
                fontWeight="600"
              >
                {active.pct}%
              </text>
              <text
                x={CX}
                y={CY + 10}
                textAnchor="middle"
                fill="var(--color-ink-300)"
                fontSize={9}
                fontFamily="var(--font-mono)"
                letterSpacing="0.1em"
              >
                {active.muscle.toUpperCase().slice(0, 12)}
              </text>
            </>
          ) : (
            <>
              <text
                x={CX}
                y={CY - 5}
                textAnchor="middle"
                fill="var(--color-ink-50)"
                fontSize={22}
                fontFamily="var(--font-display)"
                fontWeight="600"
              >
                {total}
              </text>
              <text
                x={CX}
                y={CY + 12}
                textAnchor="middle"
                fill="var(--color-ink-400)"
                fontSize={8}
                fontFamily="var(--font-mono)"
                letterSpacing="0.12em"
              >
                SERIES
              </text>
            </>
          )}
        </svg>
      </div>

      <ul className="flex flex-1 flex-col gap-2 self-center" role="list">
        {slices.map((s, i) => (
          <li
            key={s.muscle}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 transition-colors"
            style={{
              background: hovered === i ? "color-mix(in oklab, white 4%, transparent)" : "transparent",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="flex-1 truncate text-[13px] capitalize text-ink-100">{s.muscle}</span>
            <span className="font-mono text-[10px] tabular-nums text-ink-400">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
