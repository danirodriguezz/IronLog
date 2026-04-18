"use client";

import { useActionState } from "react";
import { signUpAction } from "../actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export const RegisterForm = () => {
  const [state, formAction] = useActionState(signUpAction, undefined);

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
        <h3 className="font-display text-2xl text-ink-50">Revisa tu email</h3>
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
      <Field name="name" type="text" label="Nombre" autoComplete="name" />
      <Field name="email" type="email" label="Email" autoComplete="email" required />
      <Field
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="new-password"
        required
        minLength={8}
        showToggle
        hint="Mínimo 8 caracteres."
      />

      {state?.error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-ember-500/30 bg-ember-500/10 px-3.5 py-2.5 text-[13px] text-ember-400"
        >
          {state.error}
        </div>
      ) : null}

      <p className="text-[12px] text-ink-300 leading-relaxed pt-1">
        Al crear una cuenta aceptas nuestros{" "}
        <span className="text-ink-100 underline underline-offset-4 decoration-white/20">términos</span>{" "}
        y la{" "}
        <span className="text-ink-100 underline underline-offset-4 decoration-white/20">
          política de privacidad
        </span>
        .
      </p>

      <div className="pt-1">
        <SubmitButton pendingLabel="Creando cuenta…">Crear cuenta</SubmitButton>
      </div>
    </form>
  );
};
