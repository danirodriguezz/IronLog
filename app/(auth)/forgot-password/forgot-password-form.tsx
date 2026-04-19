"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "../actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export const ForgotPasswordForm = () => {
  const [state, formAction] = useActionState(requestPasswordResetAction, undefined);

  if (state?.success) {
    return (
      <div
        className="rounded-[16px] hairline bg-ink-900/60 backdrop-blur-xl p-6 space-y-3"
        style={{ animation: "var(--animate-fade-in-up)" }}
      >
        <div className="inline-flex size-10 items-center justify-center rounded-full bg-mineral-500/15 text-mineral-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h3 className="font-display text-2xl text-ink-50">Enlace enviado</h3>
        <p className="text-ink-200 text-[14px] leading-relaxed">{state.success}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4"
      style={{ animation: "var(--animate-fade-in-up)", animationDelay: "200ms" }}
    >
      <Field
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
      />

      {state?.error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-ember-500/30 bg-ember-500/10 px-3.5 py-2.5 text-[13px] text-ember-400"
        >
          {state.error}
        </div>
      ) : null}

      <div className="pt-2">
        <SubmitButton pendingLabel="Enviando…">Enviar enlace</SubmitButton>
      </div>
    </form>
  );
};
