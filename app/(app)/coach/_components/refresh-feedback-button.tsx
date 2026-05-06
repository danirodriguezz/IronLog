"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Brain, RefreshCw, UserCog, Dumbbell } from "lucide-react";
import Link from "next/link";
import { generateWeeklyFeedback } from "../ai-actions";

type RefreshFeedbackButtonProps = {
  isFirstTime?: boolean;
};

type ErrorState = "incomplete_profile" | "insufficient_data" | "error" | null;

export const RefreshFeedbackButton = ({
  isFirstTime = false,
}: RefreshFeedbackButtonProps): React.ReactElement => {
  const [isPending, startTransition] = useTransition();
  const [errorState, setErrorState] = useState<ErrorState>(null);
  const router = useRouter();

  const handleGenerate = (): void => {
    setErrorState(null);
    startTransition(async () => {
      const result = await generateWeeklyFeedback();
      if (result.ok) {
        router.refresh();
      } else if (result.reason === "incomplete_profile") {
        setErrorState("incomplete_profile");
      } else if (result.reason === "insufficient_data") {
        setErrorState("insufficient_data");
      } else {
        setErrorState("error");
      }
    });
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-3 rounded-2xl hairline bg-ink-900/50 p-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-mineral-400/30 border-t-mineral-400" />
        <p className="text-sm text-ink-300">
          El entrenador está analizando tus datos…
        </p>
      </div>
    );
  }

  if (errorState === "incomplete_profile") {
    return (
      <div className="rounded-2xl hairline bg-ink-900/50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <UserCog size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-ink-100">Perfil incompleto</p>
            <p className="mt-1 text-sm text-ink-300">
              Necesitas rellenar tu <strong className="text-ink-100">objetivo principal</strong>,{" "}
              <strong className="text-ink-100">peso</strong> y{" "}
              <strong className="text-ink-100">edad</strong> antes de generar el informe.
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-full bg-mineral-300 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200"
        >
          <UserCog size={12} />
          Completar perfil
        </Link>
      </div>
    );
  }

  if (errorState === "insufficient_data") {
    return (
      <div className="rounded-2xl hairline bg-ink-900/50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Dumbbell size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-ink-100">Faltan datos de entrenamiento</p>
            <p className="mt-1 text-sm text-ink-300">
              Necesitas al menos <strong className="text-ink-100">una sesión registrada en los últimos 7 días</strong> para
              que el entrenador pueda analizar tu semana.
            </p>
          </div>
        </div>
        <Link
          href="/entrenar"
          className="inline-flex items-center gap-2 rounded-full bg-mineral-300 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200"
        >
          <Dumbbell size={12} />
          Ir a entrenar
        </Link>
      </div>
    );
  }

  if (errorState === "error") {
    return (
      <div className="rounded-2xl hairline bg-ink-900/50 p-6 space-y-4">
        <p className="text-sm text-ember-400">
          No se pudo conectar con la IA. Comprueba tu conexión e inténtalo de nuevo.
        </p>
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-300 transition-colors hover:text-ink-50"
        >
          <RefreshCw size={12} />
          Reintentar
        </button>
      </div>
    );
  }

  if (isFirstTime) {
    return (
      <div className="rounded-2xl hairline bg-ink-900/50 p-6 md:p-8 text-center space-y-4">
        <p className="text-sm text-ink-200 max-w-md mx-auto">
          Analiza tus últimas sesiones, rutinas y objetivos para recibir un diagnóstico
          personalizado de tu semana.
        </p>
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 rounded-full bg-mineral-300 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-950 transition-all hover:bg-mineral-200 active:scale-[0.99]"
        >
          <Brain size={14} />
          Generar informe semanal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      className="inline-flex items-center gap-2 rounded-full hairline bg-ink-800/60 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-300 transition-all hover:bg-ink-700/60 hover:text-ink-100 active:scale-[0.98]"
    >
      <RefreshCw size={12} />
      Actualizar informe
    </button>
  );
};
