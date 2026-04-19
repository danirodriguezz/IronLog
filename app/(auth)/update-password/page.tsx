import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <div className="space-y-8">
      <header
        className="space-y-3"
        style={{ animation: "var(--animate-fade-in-up)" }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-200">
          Nueva contraseña
        </p>
        <h2 className="font-display text-4xl leading-[1.02] tracking-tight text-ink-50">
          Elige una <em className="text-mineral-300 not-italic">sólida</em>.
        </h2>
        <p className="text-ink-200 text-[15px] leading-relaxed">
          Esta será tu contraseña para futuras sesiones en IronLog.
        </p>
      </header>

      <UpdatePasswordForm />
    </div>
  );
}
