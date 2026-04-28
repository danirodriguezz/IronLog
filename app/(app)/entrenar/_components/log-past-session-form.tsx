"use client";

import { useState } from "react";
import { logPastSessionAction } from "../actions";

type Routine = { id: string; name: string };

const yesterdayISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

const todayISO = (): string => new Date().toISOString().split("T")[0];

export const LogPastSessionForm = ({
  routines,
  hasActiveSession,
}: {
  routines: Routine[];
  hasActiveSession: boolean;
}): React.ReactElement => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={hasActiveSession}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/60 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-200 transition-colors hover:border-mineral-400 hover:text-mineral-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Añadir sesión pasada
      </button>
    );
  }

  return (
    <form
      action={logPastSessionAction}
      className="hairline rounded-2xl bg-ink-900/50 p-5 space-y-5"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mineral-300">
        Registrar entreno pasado
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="past-session-date"
            className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300"
          >
            Fecha del entreno
          </label>
          <input
            id="past-session-date"
            type="date"
            name="sessionDate"
            defaultValue={yesterdayISO()}
            max={todayISO()}
            required
            className="w-full rounded-md border border-ink-700 bg-ink-800/80 px-3 py-2.5 font-mono text-sm text-ink-100 transition-colors focus:border-mineral-400 focus:outline-none scheme:dark"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="past-session-routine"
            className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300"
          >
            Rutina
          </label>
          <select
            id="past-session-routine"
            name="routineId"
            required
            defaultValue=""
            className="w-full rounded-md border border-ink-700 bg-ink-800/80 px-3 py-2.5 font-mono text-sm text-ink-100 transition-colors focus:border-mineral-400 focus:outline-none scheme:dark"
          >
            <option value="" disabled>
              Selecciona una rutina
            </option>
            {routines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="submit"
          className="rounded-full bg-mineral-300 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-950 transition-colors hover:bg-mineral-200 focus:outline-none focus:ring-2 focus:ring-mineral-400 focus:ring-offset-2 focus:ring-offset-ink-950"
        >
          Registrar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-ink-700 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
