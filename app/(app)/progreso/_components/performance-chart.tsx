"use client";

import { useId, useRef, useState, useEffect } from "react";
import type { ExerciseOption, ProgressPoint } from "../actions";

type Props = {
  points: ProgressPoint[];
  exerciseType: ExerciseOption["type"];
  isPending?: boolean;
};

const valueLabel = (type: ExerciseOption["type"]): string => {
  switch (type) {
    case "strength": return "Peso máximo";
    case "bodyweight": return "Reps máximas";
    case "isometric": return "Duración máxima";
    case "cardio": return "Distancia máxima";
  }
};

const valueUnit = (type: ExerciseOption["type"]): string => {
  switch (type) {
    case "strength": return "kg";
    case "bodyweight": return "reps";
    case "isometric": return "s";
    case "cardio": return "m";
  }
};

const volumeLabel = (type: ExerciseOption["type"]): string => {
  switch (type) {
    case "strength": return "Volumen total (kg × reps)";
    case "bodyweight": return "Reps totales";
    case "isometric": return "Segundos totales";
    case "cardio": return "Metros totales";
  }
};

const formatDate = (iso: string, short = false): string =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: short ? "numeric" : "short",
  });

const niceMax = (v: number): number => {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
};

const yTicks = (max: number, n: number): number[] =>
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

type TooltipData = {
  x: number;
  y: number;
  label: string;
  value: string;
  isPr: boolean;
  rpe: number | null;
};

const PAD_T = 16;
const PAD_R = 12;
const LINE_CHART_H = 180;
const BAR_CHART_H = 80;

type ChartProps = {
  points: ProgressPoint[];
  exerciseType: ExerciseOption["type"];
  isPending: boolean;
  width: number;
};

const LineChart = ({ points, exerciseType, isPending, width }: ChartProps): React.ReactElement => {
  const uid = useId().replace(/:/g, "");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const compact = width < 480;
  const PAD_L = compact ? 36 : 48;
  const PLOT_W = width - PAD_L - PAD_R;
  const LINE_H = LINE_CHART_H - PAD_T - 8;
  const unit = valueUnit(exerciseType);
  const tickCount = compact ? 3 : 4;
  const xLabelStep = Math.max(1, Math.ceil(points.length / (compact ? 4 : 7)));

  const n = points.length;
  const maxVal = niceMax(Math.max(...points.map((p) => p.value)));
  const ticks = yTicks(maxVal, tickCount);

  const scaleX = (i: number) => PAD_L + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const scaleY = (v: number) => PAD_T + LINE_H - (maxVal > 0 ? (v / maxVal) * LINE_H : 0);
  const scaleRpeY = (rpe: number) => PAD_T + LINE_H - (rpe / 10) * LINE_H;

  const valuePts: [number, number][] = points.map((p, i) => [scaleX(i), scaleY(p.value)]);
  const rpePts: [number, number][] = points
    .map((p, i): [number, number] | null => p.rpe != null ? [scaleX(i), scaleRpeY(p.rpe)] : null)
    .filter((p): p is [number, number] => p !== null);

  const lineDPath = smoothPath(valuePts);
  const areaD =
    valuePts.length > 0
      ? `${lineDPath} L ${valuePts[valuePts.length - 1][0]} ${PAD_T + LINE_H} L ${valuePts[0][0]} ${PAD_T + LINE_H} Z`
      : "";
  const rpeDPath = smoothPath(rpePts);

  const LABEL_Y = LINE_CHART_H + 16;
  const TOTAL_H = LABEL_Y + 4;

  return (
    <svg
      role="img"
      aria-label="Gráfico de rendimiento"
      viewBox={`0 0 ${width} ${TOTAL_H}`}
      width="100%"
      height={TOTAL_H}
      style={{ overflow: "visible", display: "block" }}
      onMouseLeave={() => setTooltip(null)}
    >
      <defs>
        <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-mineral-500)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-mineral-500)" stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid + Y ticks */}
      {ticks.map((t) => {
        const y = scaleY(t);
        return (
          <g key={`tick-${t}`}>
            <line
              x1={PAD_L}
              y1={y}
              x2={width - PAD_R}
              y2={y}
              stroke="var(--color-ink-700)"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 5}
              y={y + 4}
              textAnchor="end"
              fill="var(--color-ink-400)"
              fontSize={compact ? 8 : 9}
              fontFamily="var(--font-mono)"
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* Y unit label */}
      <text
        x={6}
        y={PAD_T + LINE_H / 2}
        fill="var(--color-ink-500)"
        fontSize={7}
        fontFamily="var(--font-mono)"
        letterSpacing="0.08em"
        textAnchor="middle"
        transform={`rotate(-90, 6, ${PAD_T + LINE_H / 2})`}
      >
        {unit.toUpperCase()}
      </text>

      {/* Area */}
      <path d={areaD} fill={`url(#area-${uid})`} />

      {/* RPE line */}
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

      {/* Value line */}
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
        const cy = scaleY(p.value);
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
              onTouchStart={() =>
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
        const tx = Math.min(Math.max(tooltip.x, PAD_L + 46), width - PAD_R - 46);
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
                fill={
                  li === 0
                    ? "var(--color-ink-300)"
                    : li === 2 && tooltip.isPr
                    ? "var(--color-mineral-400)"
                    : "var(--color-ink-50)"
                }
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

      {/* X labels */}
      {points.map((p, i) => {
        if (i % xLabelStep !== 0 && i !== n - 1) return null;
        return (
          <text
            key={`xl-${i}`}
            x={scaleX(i)}
            y={LABEL_Y}
            textAnchor="middle"
            fill="var(--color-ink-400)"
            fontSize={compact ? 8 : 9}
            fontFamily="var(--font-mono)"
          >
            {formatDate(p.date, compact)}
          </text>
        );
      })}
    </svg>
  );
};

const BarChart = ({ points, exerciseType, isPending, width }: ChartProps): React.ReactElement => {
  const uid = useId().replace(/:/g, "");
  const compact = width < 480;
  const PAD_L = compact ? 36 : 48;
  const PLOT_W = width - PAD_L - PAD_R;
  const BAR_H = BAR_CHART_H - 4;

  const n = points.length;
  const maxVol = niceMax(Math.max(...points.map((p) => p.volume)));
  const barW = Math.max(3, Math.min(18, PLOT_W / n - 3));

  const scaleX = (i: number) => PAD_L + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const scaleH = (v: number) => (maxVol > 0 ? (v / maxVol) * BAR_H : 0);

  const xLabelStep = Math.max(1, Math.ceil(n / (compact ? 4 : 7)));
  const LABEL_Y = BAR_CHART_H + 16;
  const TOTAL_H = LABEL_Y + 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${TOTAL_H}`}
      width="100%"
      height={TOTAL_H}
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <linearGradient id={`bar-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-mineral-500)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--color-mineral-700)" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Max reference line */}
      <line
        x1={PAD_L}
        y1={0}
        x2={width - PAD_R}
        y2={0}
        stroke="var(--color-ink-700)"
        strokeWidth={1}
      />

      {/* Y max label */}
      <text
        x={PAD_L - 5}
        y={10}
        textAnchor="end"
        fill="var(--color-ink-500)"
        fontSize={compact ? 7 : 8}
        fontFamily="var(--font-mono)"
      >
        {maxVol}
      </text>

      {/* Bars */}
      {points.map((p, i) => {
        const bh = scaleH(p.volume);
        const bx = scaleX(i) - barW / 2;
        const by = BAR_H - bh;
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

      {/* X labels */}
      {points.map((p, i) => {
        if (i % xLabelStep !== 0 && i !== n - 1) return null;
        return (
          <text
            key={`xl-${i}`}
            x={scaleX(i)}
            y={LABEL_Y}
            textAnchor="middle"
            fill="var(--color-ink-400)"
            fontSize={compact ? 8 : 9}
            fontFamily="var(--font-mono)"
          >
            {formatDate(p.date, compact)}
          </text>
        );
      })}
    </svg>
  );
};

export const PerformanceChart = ({ points, exerciseType, isPending = false }: Props): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl hairline bg-ink-900/30">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Sin sesiones registradas
        </p>
      </div>
    );
  }

  const hasRpe = points.some((p) => p.rpe != null);

  return (
    <div
      ref={containerRef}
      className={`space-y-6 transition-opacity duration-200 ${isPending ? "opacity-40" : "opacity-100"}`}
    >
      {/* Line chart block */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            {valueLabel(exerciseType)}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="block h-px w-4" style={{ background: "var(--color-mineral-400)" }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-500">
                {valueUnit(exerciseType)}
              </span>
            </div>
            {hasRpe && (
              <div className="flex items-center gap-1.5">
                <span
                  className="block h-px w-4"
                  style={{ borderTop: "1.5px dashed var(--color-ember-400)" }}
                />
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-500">
                  RPE
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span
                className="block h-2 w-2 rounded-full border-2"
                style={{
                  background: "var(--color-mineral-300)",
                  borderColor: "var(--color-mineral-400)",
                }}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-500">
                PR
              </span>
            </div>
          </div>
        </div>
        <LineChart
          points={points}
          exerciseType={exerciseType}
          isPending={isPending}
          width={width}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-ink-800" />

      {/* Bar chart block */}
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
          {volumeLabel(exerciseType)}
        </p>
        <BarChart
          points={points}
          exerciseType={exerciseType}
          isPending={isPending}
          width={width}
        />
      </div>
    </div>
  );
};
