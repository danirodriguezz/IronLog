import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <header
        className="space-y-3"
        style={{ animation: "var(--animate-fade-in-up)" }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-200">
          Primer día
        </p>
        <h2 className="font-display text-4xl leading-[1.02] tracking-tight text-ink-50">
          Tu próximo <em className="text-mineral-300 not-italic">PR</em> empieza aquí.
        </h2>
        <p className="text-ink-200 text-[15px] leading-relaxed">
          Crea una cuenta y empieza a registrar tus entrenamientos.
        </p>
      </header>

      <RegisterForm />

      <p
        className="text-center text-[14px] text-ink-200"
        style={{ animation: "var(--animate-fade-in-up)", animationDelay: "400ms" }}
      >
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="text-ink-50 font-medium hover:text-mineral-300 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-mineral-300"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
