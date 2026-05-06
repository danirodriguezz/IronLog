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
  primary_goal: string | null;
  secondary_goal: string | null;
  weekly_session_target: number | null;
  goal_notes: string | null;
  experience_level: string | null;
};

type ProfileFormProps = {
  profile: Profile;
};

const GOAL_OPTIONS = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "fuerza", label: "Fuerza" },
  { value: "resistencia", label: "Resistencia" },
  { value: "perder_grasa", label: "Perder grasa" },
  { value: "salud_general", label: "Salud general" },
  { value: "rendimiento", label: "Rendimiento" },
] as const;

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
] as const;

type SelectFieldProps = {
  label: string;
  name: string;
  defaultValue: string | null;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
};

const SelectField = ({ label, name, defaultValue, options, placeholder = "Sin especificar" }: SelectFieldProps): React.ReactElement => (
  <div className="relative">
    <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 mb-2">
      {label}
    </label>
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="w-full rounded-md border border-white/10 bg-ink-800/60 px-4 py-3 text-sm text-ink-100 transition-colors hover:border-white/20 focus:border-mineral-400/60 focus:outline-none appearance-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

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

      {/* Sección objetivos para la IA */}
      <div className="pt-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-400 mb-4">
          Objetivos · usados por el AI Coach
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Objetivo principal"
              name="primary_goal"
              defaultValue={profile.primary_goal}
              options={GOAL_OPTIONS}
            />
            <SelectField
              label="Objetivo secundario"
              name="secondary_goal"
              defaultValue={profile.secondary_goal}
              options={GOAL_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Nivel de experiencia"
              name="experience_level"
              defaultValue={profile.experience_level}
              options={LEVEL_OPTIONS}
            />
            <Field
              label="Sesiones objetivo por semana"
              name="weekly_session_target"
              type="number"
              inputMode="numeric"
              min={1}
              max={7}
              defaultValue={profile.weekly_session_target ?? ""}
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 mb-2">
              Notas para el entrenador
            </label>
            <textarea
              name="goal_notes"
              defaultValue={profile.goal_notes ?? ""}
              rows={3}
              placeholder="Lesiones, preferencias, contexto que el AI Coach debe saber..."
              className="w-full rounded-md border border-white/10 bg-ink-800/60 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-500 transition-colors hover:border-white/20 focus:border-mineral-400/60 focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Campo goal legacy — visible como "descripción corta de perfil" */}
      <Field
        label="Descripción del perfil (visible públicamente)"
        name="goal"
        defaultValue={profile.goal ?? ""}
      />

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
