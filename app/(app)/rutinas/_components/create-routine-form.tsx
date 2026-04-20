"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createRoutineAction } from "../actions";

export const CreateRoutineForm = (): React.ReactElement => {
  const [state, formAction] = useActionState(createRoutineAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Nombre"
        name="name"
        required
        maxLength={80}
        autoComplete="off"
        hint="Ej: Día de pierna, Empuje, Full body A…"
      />
      <Field
        label="Descripción (opcional)"
        name="description"
        maxLength={200}
        autoComplete="off"
      />
      {state?.error ? (
        <p className="text-[13px] text-ember-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Creando…">Crear rutina</SubmitButton>
    </form>
  );
};
