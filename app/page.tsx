import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-ink-950 text-ink-50">
      <div className="aurora" />
      <div className="absolute inset-0 grid-texture opacity-50" />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-display text-xl tracking-tight">IronLog</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-[13px] text-ink-100 hover:text-ink-50 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-ink-50 px-4 py-2 text-[13px] font-medium text-ink-950 hover:scale-[1.02] transition-transform"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-8">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-200"
            style={{ animation: "var(--animate-fade-in-up)" }}
          >
            PWA · Entrenamiento de fuerza
          </p>
          <h1
            className="font-display text-6xl md:text-8xl leading-[0.92] tracking-tight"
            style={{ animation: "var(--animate-fade-in-up)", animationDelay: "120ms" }}
          >
            Lift. Log.
            <br />
            <em className="not-italic bg-linear-to-r from-mineral-200 via-mineral-300 to-mineral-500 bg-clip-text text-transparent">
              Level up.
            </em>
          </h1>
          <p
            className="text-ink-200 text-lg md:text-xl max-w-xl mx-auto leading-relaxed"
            style={{ animation: "var(--animate-fade-in-up)", animationDelay: "240ms" }}
          >
            Planifica rutinas, registra series en tiempo real y visualiza tu progreso histórico.
          </p>
          <div
            className="flex items-center justify-center gap-3 pt-4"
            style={{ animation: "var(--animate-fade-in-up)", animationDelay: "360ms" }}
          >
            <Link
              href="/register"
              className="rounded-full bg-ink-50 px-6 py-3 text-[14px] font-medium text-ink-950 hover:scale-[1.02] transition-transform"
            >
              Empezar ahora
            </Link>
            <Link
              href="/login"
              className="rounded-full hairline px-6 py-3 text-[14px] text-ink-100 hover:bg-white/5 transition-colors"
            >
              Tengo cuenta
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
