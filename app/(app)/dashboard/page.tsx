import { createClient } from "@/lib/supabase/server";
import { StatCard } from "./_components/stat-card";

const DashboardPage = async (): Promise<React.ReactElement> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    ((user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]) ??
    user?.email?.split("@")[0] ??
    "Atleta";

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <section className="space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
          Sesión iniciada
        </p>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.98] tracking-tight">
          Hola, <em className="not-italic text-mineral-200">{firstName}</em>.
        </h1>
        <p className="max-w-xl text-ink-200 text-lg">
          Aún no has configurado tu primera rutina. Cuando empieces a entrenar, tu panel se llenará
          con tu progreso real.
        </p>
      </section>

      <section
        aria-label="Resumen"
        className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <StatCard
          eyebrow="Próxima rutina"
          headline="Sin programar"
          hint="Crea tu primera rutina para empezar a registrar sesiones."
        />
        <StatCard
          eyebrow="Último PR"
          headline="—"
          hint="Tus récords personales aparecerán aquí en cuanto logues tu primer set."
        />
        <StatCard
          eyebrow="Volumen semanal"
          headline="0 kg"
          hint="Sumamos el tonelaje total de todas las series que completes."
        />
      </section>

      <section className="mt-16">
        <div className="hairline rounded-2xl bg-ink-900/40 p-8 md:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">
            Siguiente paso
          </p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl leading-tight">
            Diseña tu primera rutina.
          </h2>
          <p className="mt-3 max-w-xl text-ink-200">
            Empieza por un split sencillo o importa una plantilla. Podrás ajustarla sobre la marcha
            y cada sesión quedará registrada para construir tu historial.
          </p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
            Disponible próximamente
          </p>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
