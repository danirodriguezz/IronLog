"use client";

import { useState, useTransition } from "react";
import { Brain, TrendingUp, Zap, RefreshCw, UserCog } from "lucide-react";
import Link from "next/link";
import { generateWeeklyFeedback, type WeeklyFeedback } from "@/app/(app)/progreso/ai-actions";

const scoreColor = (score: number): string => {
  if (score < 4) return "bg-ember-500";
  if (score < 7) return "bg-amber-400";
  return "bg-mineral-400";
};

const scoreLabel = (score: number): string => {
  if (score < 4) return "Baja";
  if (score < 7) return "Media";
  return "Alta";
};

const Skeleton = (): React.ReactElement => (
  <div className="mt-6 space-y-3 animate-pulse">
    <div className="h-3 w-3/4 rounded-full bg-ink-700" />
    <div className="h-3 w-full rounded-full bg-ink-700" />
    <div className="h-3 w-5/6 rounded-full bg-ink-700" />
    <div className="mt-5 h-3 w-2/3 rounded-full bg-ink-700" />
    <div className="h-3 w-full rounded-full bg-ink-700" />
    <div className="mt-5 h-3 w-3/4 rounded-full bg-ink-700" />
    <div className="h-3 w-5/6 rounded-full bg-ink-700" />
  </div>
);

type FeedbackRowProps = {
  icon: React.ReactElement;
  label: string;
  text: string;
};

const FeedbackRow = ({ icon, label, text }: FeedbackRowProps): React.ReactElement => (
  <div className="flex gap-3">
    <div className="mt-0.5 shrink-0 text-mineral-400">{icon}</div>
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-100">{text}</p>
    </div>
  </div>
);

type AdherenceBarProps = { score: number };

const AdherenceBar = ({ score }: AdherenceBarProps): React.ReactElement => (
  <div>
    <div className="flex items-center justify-between">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
        Consistencia
      </p>
      <span className="font-mono text-[10px] text-ink-300">
        {score}/10 · {scoreLabel(score)}
      </span>
    </div>
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
      <div
        className={`h-full rounded-full transition-all duration-700 ${scoreColor(score)}`}
        style={{ width: `${score * 10}%` }}
      />
    </div>
  </div>
);

type CardState = "idle" | "incomplete_profile" | "error";

export const AiCoachCard = (): React.ReactElement => {
  const [feedback, setFeedback] = useState<WeeklyFeedback | null>(null);
  const [state, setState] = useState<CardState>("idle");
  const [isPending, startTransition] = useTransition();

  const handleGenerate = (): void => {
    setState("idle");
    startTransition(async () => {
      try {
        const result = await generateWeeklyFeedback();
        if (result.ok) {
          setFeedback(result.feedback);
        } else if (result.reason === "incomplete_profile") {
          setState("incomplete_profile");
        } else {
          setState("error");
        }
      } catch (err) {
        console.error("[AiCoachCard]", err);
        setState("error");
      }
    });
  };

  return (
    <article className="relative overflow-hidden rounded-2xl hairline bg-ink-900/50 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
      />

      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mineral-400">
        AI Coach
      </p>
      <p className="mt-4 font-display text-3xl leading-none tracking-tight text-ink-50">
        Feedback semanal
      </p>

      {/* Estado de carga */}
      {isPending && <Skeleton />}

      {/* Estado de perfil incompleto */}
      {!isPending && state === "incomplete_profile" && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-ink-200">
            Para generar un análisis personalizado necesitamos conocer tu{" "}
            <span className="text-ink-50">edad</span>,{" "}
            <span className="text-ink-50">peso</span> y{" "}
            <span className="text-ink-50">objetivo</span>. Completa tu perfil y vuelve aquí.
          </p>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-full bg-mineral-300 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200 active:scale-[0.99]"
          >
            <UserCog size={13} />
            Completar perfil
          </Link>
        </div>
      )}

      {/* Estado de error */}
      {!isPending && state === "error" && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-ember-500">
            No se pudo conectar con la IA. Comprueba tu conexión o inténtalo de nuevo.
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-300 transition-colors hover:text-ink-50"
          >
            <RefreshCw size={12} />
            Reintentar
          </button>
        </div>
      )}

      {/* Estado de éxito */}
      {!isPending && state === "idle" && feedback && (
        <div className="mt-6 space-y-5">
          <FeedbackRow
            icon={<Zap size={16} />}
            label="Motivación"
            text={feedback.motivationalMessage}
          />
          <div className="hairline" />
          <FeedbackRow
            icon={<TrendingUp size={16} />}
            label="Volumen"
            text={feedback.volumeAnalysis}
          />
          <div className="hairline" />
          <FeedbackRow
            icon={<Brain size={16} />}
            label="Próximo entreno"
            text={feedback.nextSessionAdvice}
          />
          <div className="hairline" />
          <AdherenceBar score={feedback.adherenceScore} />

          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 transition-colors hover:text-ink-200"
          >
            <RefreshCw size={11} />
            Actualizar análisis
          </button>
        </div>
      )}

      {/* Estado inicial */}
      {!isPending && state === "idle" && !feedback && (
        <div className="mt-6 space-y-5">
          <p className="text-sm text-ink-200">
            Analiza tus últimas sesiones, rutinas y objetivos para recibir un
            diagnóstico personalizado de tu semana.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-mineral-300 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Brain size={13} />
            Generar feedback semanal
          </button>
        </div>
      )}
    </article>
  );
};
