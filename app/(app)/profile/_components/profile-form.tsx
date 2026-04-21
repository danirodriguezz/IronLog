"use client";

import { useActionState, useId } from "react";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfileAction } from "../actions";

type Profile = {
  username: string;
  full_name: string | null;
  age: number | null;
  weight_kg: number | null;
  goal: string | null;
  is_public: boolean;
};

type ProfileFormProps = {
  profile: Profile;
};

export const ProfileForm = ({ profile }: ProfileFormProps): React.ReactElement => {
  const [state, action] = useActionState(updateProfileAction, undefined);
  const toggleId = useId();

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Nombre completo"
          name="full_name"
          defaultValue={profile.full_name ?? ""}
          autoComplete="name"
        />
        <Field
          label="Nombre de usuario"
          name="username"
          defaultValue={profile.username}
          autoComplete="username"
          autoCapitalize="none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Edad"
          name="age"
          type="number"
          inputMode="numeric"
          min={1}
          max={119}
          defaultValue={profile.age ?? ""}
        />
        <Field
          label="Peso (kg)"
          name="weight_kg"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0.01}
          defaultValue={profile.weight_kg ?? ""}
        />
      </div>

      <Field
        label="Objetivo"
        name="goal"
        defaultValue={profile.goal ?? ""}
      />

      {/* Privacy toggle — checkbox value "true" only submits when checked;
          the action reads formData.get("is_public") === "true" */}
      <div className="flex items-center justify-between rounded-md border border-white/10 bg-ink-800/60 px-4 py-3.5 transition-colors hover:border-white/20">
        <div>
          <p className="text-[15px] text-ink-50">Perfil público</p>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-300">
            Visible para otros usuarios
          </p>
        </div>
        <label htmlFor={toggleId} className="relative inline-flex cursor-pointer items-center">
          <input
            id={toggleId}
            type="checkbox"
            name="is_public"
            value="true"
            defaultChecked={profile.is_public}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-ink-500 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-ink-200 after:transition-transform peer-checked:bg-mineral-500 peer-checked:after:translate-x-5 peer-checked:after:bg-ink-950 peer-focus:ring-2 peer-focus:ring-mineral-400/40" />
        </label>
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-sm bg-ember-500/10 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-ember-400"
        >
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p
          role="status"
          className="rounded-sm bg-mineral-500/10 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-mineral-300"
        >
          {state.success}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton>
    </form>
  );
};
