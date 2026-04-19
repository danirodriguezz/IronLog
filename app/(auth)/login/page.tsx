import Link from "next/link";
import { LoginForm } from "./login-form";
import { GoogleButton } from "@/components/ui/google-button";
import { Separator } from "@/components/ui/separator";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo = "/dashboard" } = await searchParams;

  return (
    <div className="space-y-8">
      <header
        className="space-y-3"
        style={{ animation: "var(--animate-fade-in-up)" }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-200">
          Bienvenido de vuelta
        </p>
        <h2 className="font-display text-4xl leading-[1.02] tracking-tight text-ink-50">
          Entrena con <em className="text-mineral-300 not-italic">constancia</em>.
        </h2>
        <p className="text-ink-200 text-[15px] leading-relaxed">
          Accede para registrar la sesión de hoy.
        </p>
      </header>

      <div
        className="space-y-4"
        style={{ animation: "var(--animate-fade-in-up)", animationDelay: "150ms" }}
      >
        <GoogleButton redirectTo={redirectTo} />
        <Separator />
      </div>

      <LoginForm redirectTo={redirectTo} />

      <p
        className="text-center text-[14px] text-ink-200"
        style={{ animation: "var(--animate-fade-in-up)", animationDelay: "400ms" }}
      >
        ¿Aún no tienes cuenta?{" "}
        <Link
          href="/register"
          className="text-ink-50 font-medium hover:text-mineral-300 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-mineral-300"
        >
          Crea una
        </Link>
      </p>
    </div>
  );
}
