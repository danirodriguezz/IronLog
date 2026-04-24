"use client";

import { useState } from "react";

type Tab = "actividad" | "perfil";

const TABS: { id: Tab; label: string }[] = [
  { id: "actividad", label: "Actividad" },
  { id: "perfil", label: "Mi perfil" },
];

type Props = {
  activityPanel: React.ReactNode;
  profilePanel: React.ReactNode;
};

export const ProfileTabs = ({ activityPanel, profilePanel }: Props): React.ReactElement => {
  const [tab, setTab] = useState<Tab>("actividad");

  return (
    <div className="mt-10">
      <div className="border-b border-white/6" role="tablist" aria-label="Secciones del perfil">
        <div className="flex gap-0">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`relative pb-3 pr-6 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mineral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${
                  active ? "text-ink-50" : "text-ink-300 hover:text-ink-200"
                }`}
              >
                {t.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-0 right-6 h-px bg-mineral-400"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="panel-actividad"
        role="tabpanel"
        aria-labelledby="tab-actividad"
        className={tab === "actividad" ? "" : "hidden"}
      >
        {activityPanel}
      </div>

      <div
        id="panel-perfil"
        role="tabpanel"
        aria-labelledby="tab-perfil"
        className={tab === "perfil" ? "" : "hidden"}
      >
        {profilePanel}
      </div>
    </div>
  );
};
