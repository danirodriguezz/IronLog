import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <header
        className="space-y-3"
        style={{ animation: "var(--animate-fade-in-up)" }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-200">
          Recuperar acceso
        </p>
        <h2 className="font-display text-4xl leading-[1.02] tracking-tight text-ink-50">
          Volvamos a la <em className="text-mineral-300 not-italic">barra</em>.
        </h2>
        <p className="text-ink-200 text-[15px] leading-relaxed">
          Introduce tu email y te enviaremos un enlace para restablecer la contraseña.
        </p>
      </header>

      <ForgotPasswordForm />

      <p
        className="text-center text-[14px] text-ink-200"
        style={{ animation: "var(--animate-fade-in-up)", animationDelay: "400ms" }}
      >
        ¿Lo recordaste?{" "}
        <Link
          href="/login"
          className="text-ink-50 font-medium hover:text-mineral-300 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-mineral-300"
        >
          Volver a entrar
        </Link>
      </p>
    </div>
  );
}
