"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "../actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export const UpdatePasswordForm = () => {
  const [state, formAction] = useActionState(updatePasswordAction, undefined);

  return (
    <form
      action={formAction}
      className="space-y-4"
      style={{ animation: "var(--animate-fade-in-up)", animationDelay: "200ms" }}
    >
      <Field
        name="password"
        type="password"
        label="Nueva contraseña"
        autoComplete="new-password"
        required
        minLength={8}
        showToggle
        hint="Mínimo 8 caracteres."
      />
      <Field
        name="confirm"
        type="password"
        label="Confirmar contraseña"
        autoComplete="new-password"
        required
        minLength={8}
        showToggle
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
        <SubmitButton pendingLabel="Guardando…">Guardar contraseña</SubmitButton>
      </div>
    </form>
  );
};
