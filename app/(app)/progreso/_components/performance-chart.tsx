"use client";

import { useId, useState } from "react";
import type { ExerciseOption, ProgressPoint } from "../actions";

type Props = {
  points: ProgressPoint[];
  exerciseType: ExerciseOption["type"];
  isPending?: boolean;
};

const W = 760;
const H_LINE = 196;
const H_BAR = 72;
const H_GAP = 20;
const H_TOTAL = H_LINE + H_GAP + H_BAR + 28;

const PAD_L = 52;
const PAD_R = 16;
const PAD_T = 16;
const PLOT_W = W - PAD_L - PAD_R;
const LINE_H = H_LINE - PAD_T - 4;
const BAR_TOP = H_LINE + H_GAP;

const valueUnit = (type: ExerciseOption["type"]): string => {
  switch (type) {
    case "strength": return "kg";
    case "bodyweight": return "reps";
    case "isometric": return "s";
    case "cardio": return "m";
  }
};

const volumeUnit = (type: ExerciseOption["type"]): string => {
  switch (type) {
    case "strength": return "kg·rep";
    case "bodyweight": return "reps tot.";
    case "isometric": return "s tot.";
    case "cardio": return "m tot.";
  }
};

const formatDate = (iso: string): string =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });

const niceMax = (v: number): number => {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
};

const yTicks = (max: number, n = 4): number[] =>
  Array.from({ length: n + 1 }, (_, i) => Math.round((max / n) * i));

const smoothPath = (pts: [number, number][]): string => {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  const d: string[] = [`M ${pts[0][0]} ${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2[0]} ${p2[1]}`);
  }
  return d.join(" ");
};

type TooltipData = { x: number; y: number; label: string; value: string; isPr: boolean; rpe: number | null };

export const PerformanceChart = ({ points, exerciseType, isPending }: Props): React.ReactElement => {
  const uid = useId().replace(/:/g, "");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl hairline bg-ink-900/30">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Sin sesiones registradas
        </p>
      </div>
    );
  }

  const n = points.length;
  const maxVal = niceMax(Math.max(...points.map((p) => p.value)));
  const maxVol = niceMax(Math.max(...points.map((p) => p.volume)));
  const unit = valueUnit(exerciseType);

  const scaleX = (i: number) => PAD_L + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const scaleLineY = (v: number) => PAD_T + LINE_H - (maxVal > 0 ? (v / maxVal) * LINE_H : 0);
  const scaleBarH = (v: number) => maxVol > 0 ? (v / maxVol) * (H_BAR - 4) : 0;
  const scaleRpeY = (rpe: number) => PAD_T + LINE_H - (rpe / 10) * LINE_H;

  const valuePts: [number, number][] = points.map((p, i) => [scaleX(i), scaleLineY(p.value)]);
  const rpePts: [number, number][] = points
    .map((p, i): [number, number] | null => p.rpe != null ? [scaleX(i), scaleRpeY(p.rpe)] : null)
    .filter((p): p is [number, number] => p !== null);

  const lineDPath = smoothPath(valuePts);
  const areaD =
    valuePts.length > 0
      ? `${lineDPath} L ${valuePts[valuePts.length - 1][0]} ${PAD_T + LINE_H} L ${valuePts[0][0]} ${PAD_T + LINE_H} Z`
      : "";
  const rpeDPath = smoothPath(rpePts);

  const ticks = yTicks(maxVal);
  const barW = Math.max(4, Math.min(20, PLOT_W / n - 4));

  const xLabelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <div className={`relative transition-opacity duration-200 ${isPending ? "opacity-40" : "opacity-100"}`}>
      <svg
        viewBox={`0 0 ${W} ${H_TOTAL}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Gráfico de rendimiento y volumen"
        style={{ overflow: "visible" }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-mineral-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-mineral-500)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`bar-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-mineral-500)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--color-mineral-700)" stopOpacity="0.5" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Y-axis grid lines and labels — line chart */}
        {ticks.map((t) => {
          const y = scaleLineY(t);
          return (
            <g key={`tick-${t}`}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke="var(--color-ink-700)"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 6}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-ink-400)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          x={8}
          y={PAD_T + LINE_H / 2}
          fill="var(--color-ink-400)"
          fontSize={8}
          fontFamily="var(--font-mono)"
          letterSpacing="0.1em"
          textAnchor="middle"
          transform={`rotate(-90, 8, ${PAD_T + LINE_H / 2})`}
        >
          {unit.toUpperCase()}
        </text>

        {/* Area fill */}
        <path d={areaD} fill={`url(#area-${uid})`} />

        {/* RPE overlay — dashed ember line */}
        {rpeDPath && (
          <path
            d={rpeDPath}
            fill="none"
            stroke="var(--color-ember-400)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.6}
          />
        )}

        {/* Main value line */}
        <path
          d={lineDPath}
          fill="none"
          stroke="var(--color-mineral-400)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => {
          const cx = scaleX(i);
          const cy = scaleLineY(p.value);
          return (
            <g key={p.sessionId}>
              {p.isPr && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={9}
                  fill="var(--color-mineral-400)"
                  opacity={0.18}
                  filter={`url(#glow-${uid})`}
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={p.isPr ? 5 : 3.5}
                fill={p.isPr ? "var(--color-mineral-300)" : "var(--color-ink-800)"}
                stroke={p.isPr ? "var(--color-mineral-400)" : "var(--color-mineral-600)"}
                strokeWidth={p.isPr ? 2 : 1.5}
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  setTooltip({
                    x: cx,
                    y: cy - 14,
                    label: formatDate(p.date),
                    value: `${p.value} ${unit}`,
                    isPr: p.isPr,
                    rpe: p.rpe,
                  })
                }
              />
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = Math.min(Math.max(tooltip.x, PAD_L + 46), W - PAD_R - 46);
          const lines = [
            tooltip.label,
            tooltip.value,
            ...(tooltip.isPr ? ["✦ Récord personal"] : []),
            ...(tooltip.rpe != null ? [`RPE ${tooltip.rpe}`] : []),
          ];
          const boxH = 14 + lines.length * 13;
          return (
            <g>
              <rect
                x={tx - 46}
                y={tooltip.y - boxH}
                width={92}
                height={boxH}
                rx={5}
                fill="var(--color-ink-800)"
                stroke="color-mix(in oklab, white 12%, transparent)"
                strokeWidth={1}
              />
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={tx}
                  y={tooltip.y - boxH + 13 + li * 13}
                  textAnchor="middle"
                  fill={li === 0 ? "var(--color-ink-300)" : li === 2 && tooltip.isPr ? "var(--color-mineral-400)" : "var(--color-ink-50)"}
                  fontSize={li === 0 ? 9 : 10}
                  fontFamily="var(--font-mono)"
                  fontWeight={li === 1 ? "600" : "400"}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })()}

        {/* ── Volume bar chart ── */}
        <text
          x={PAD_L - 6}
          y={BAR_TOP + 10}
          textAnchor="end"
          fill="var(--color-ink-400)"
          fontSize={8}
          fontFamily="var(--font-mono)"
          letterSpacing="0.08em"
        >
          {volumeUnit(exerciseType).toUpperCase()}
        </text>

        {points.map((p, i) => {
          const bh = scaleBarH(p.volume);
          const bx = scaleX(i) - barW / 2;
          const by = BAR_TOP + H_BAR - 4 - bh;
          return (
            <rect
              key={`bar-${p.sessionId}`}
              x={bx}
              y={by}
              width={barW}
              height={Math.max(bh, 1)}
              rx={2}
              fill={`url(#bar-${uid})`}
            />
          );
        })}

        {/* Divider between charts */}
        <line
          x1={PAD_L}
          y1={BAR_TOP - 6}
          x2={W - PAD_R}
          y2={BAR_TOP - 6}
          stroke="var(--color-ink-700)"
          strokeWidth={1}
        />

        {/* X-axis labels */}
        {points.map((p, i) => {
          if (i % xLabelStep !== 0 && i !== n - 1) return null;
          return (
            <text
              key={`xl-${i}`}
              x={scaleX(i)}
              y={H_TOTAL - 4}
              textAnchor="middle"
              fill="var(--color-ink-400)"
              fontSize={9}
              fontFamily="var(--font-mono)"
            >
              {formatDate(p.date)}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="block h-px w-5" style={{ background: "var(--color-mineral-400)" }} />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-400">
            {unit === "kg" ? "Peso máx." : unit === "reps" ? "Reps máx." : unit === "s" ? "Duración máx." : "Distancia máx."}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="block h-px w-5"
            style={{
              borderTop: "1.5px dashed var(--color-ember-400)",
            }}
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-400">RPE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="block h-2 w-2 rounded-full border-2"
            style={{
              background: "var(--color-mineral-300)",
              borderColor: "var(--color-mineral-400)",
            }}
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-400">PR</span>
        </div>
      </div>
    </div>
  );
};
