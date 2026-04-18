"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "../actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type LoginFormProps = {
  redirectTo: string;
};

export const LoginForm = ({ redirectTo }: LoginFormProps) => {
  const [state, formAction] = useActionState(signInAction, undefined);

  return (
    <form
      action={formAction}
      className="space-y-4"
      style={{ animation: "var(--animate-fade-in-up)", animationDelay: "200ms" }}
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <Field
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
      />
      <Field
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        required
        showToggle
      />

      <div className="flex items-center justify-between pt-1">
        <label className="inline-flex items-center gap-2 text-[13px] text-ink-200 select-none cursor-pointer">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="size-4 appearance-none rounded-[5px] border border-white/15 bg-ink-800 checked:border-mineral-400 checked:bg-mineral-400 transition-colors relative before:absolute before:inset-0 before:content-['✓'] before:text-ink-950 before:text-[11px] before:flex before:items-center before:justify-center before:opacity-0 checked:before:opacity-100"
          />
          Mantener sesión
        </label>
        <Link
          href="/forgot-password"
          className="text-[13px] text-ink-200 hover:text-mineral-300 transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {state?.error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-ember-500/30 bg-ember-500/10 px-3.5 py-2.5 text-[13px] text-ember-400"
        >
          {state.error}
        </div>
      ) : null}

      <div className="pt-2">
        <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
      </div>
    </form>
  );
};
