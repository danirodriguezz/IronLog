import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "../(auth)/actions";
import { Logo } from "@/components/brand/logo";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="relative min-h-dvh bg-ink-950 text-ink-50">
      <div className="aurora opacity-40" />
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display text-xl">IronLog</span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full hairline bg-ink-800/60 backdrop-blur px-4 py-2 text-[13px] text-ink-100 hover:text-ink-50 hover:bg-ink-700 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        <section className="mt-20 space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
            Sesión iniciada
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-[0.98] tracking-tight">
            Hola, {user.user_metadata?.full_name ?? user.email?.split("@")[0]}.
          </h1>
          <p className="text-ink-200 text-lg max-w-xl">
            Aquí aparecerá tu panel: rutina del día, último PR y tu curva de fuerza. Próximamente.
          </p>
        </section>
      </div>
    </div>
  );
}
