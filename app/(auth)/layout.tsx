import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const metrics = [
  { label: "Squat", value: "142.5", unit: "kg", delta: "+5.0" },
  { label: "Bench", value: "95.0", unit: "kg", delta: "+2.5" },
  { label: "Deadlift", value: "180.0", unit: "kg", delta: "+7.5" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-ink-950 text-ink-50">
      {/* Left: hero / editorial column */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14">
        <div className="aurora" />
        <div className="absolute inset-0 grid-texture opacity-60" />

        <header className="relative z-10 flex items-center gap-3">
          <Logo size={30} />
          <span className="font-display text-[22px] tracking-tight">IronLog</span>
        </header>

        <div className="relative z-10 max-w-xl space-y-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-200">
            <span className="inline-block size-1.5 rounded-full bg-mineral-400 mr-2 align-middle animate-[pulseGlow_3s_ease-in-out_infinite]" />
            Mesociclo activo · Semana 3 / 6
          </p>
          <h1 className="font-display text-5xl xl:text-6xl leading-[0.95] tracking-tight">
            Cada repetición,
            <br />
            <em className="not-italic bg-gradient-to-r from-mineral-200 via-mineral-300 to-mineral-500 bg-clip-text text-transparent">
              una decisión
            </em>{" "}
            medida.
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-md">
            Registra tus series en segundos. Deja que la curva de fuerza hable por ti.
          </p>

          {/* Floating stats card */}
          <div className="relative isolate mt-4">
            <div className="relative rounded-2xl hairline bg-ink-900/70 backdrop-blur-xl p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-200">
                  PR · últimos 30 días
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-mineral-300">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M5 1.5L9 8H1z" />
                  </svg>
                  +12.3%
                </span>
              </div>
              <ul className="divide-y divide-white/5">
                {metrics.map((m, i) => (
                  <li
                    key={m.label}
                    className="flex items-baseline justify-between py-3"
                    style={{ animation: `var(--animate-fade-in-up)`, animationDelay: `${300 + i * 120}ms` }}
                  >
                    <span className="text-ink-100 text-sm">{m.label}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-2xl text-ink-50 tabular-nums">
                        {m.value}
                      </span>
                      <span className="text-xs text-ink-200">{m.unit}</span>
                      <span className="font-mono text-[11px] text-mineral-300 tabular-nums">
                        {m.delta}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -inset-10 -z-10 bg-mineral-500/10 blur-3xl rounded-full" />
          </div>
        </div>

        <footer className="relative z-10 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.2em] text-ink-300">
          <span>© {new Date().getFullYear()} IronLog</span>
          <span className="flex items-center gap-4">
            <Link href="#" className="hover:text-ink-100 transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-ink-100 transition-colors">Términos</Link>
          </span>
        </footer>
      </aside>

      {/* Right: form column */}
      <main className="relative flex flex-col">
        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center justify-between p-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display text-lg">IronLog</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-16">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
