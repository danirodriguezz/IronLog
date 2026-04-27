"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GoogleButtonProps = {
  redirectTo?: string;
  label?: string;
};

const GoogleGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
    <path
      fill="#EA4335"
      d="M9 3.48c1.69 0 2.85.73 3.5 1.34l2.56-2.5C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.97 2.3C4.64 5.11 6.65 3.48 9 3.48z"
    />
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72l2.9 2.25c1.7-1.57 2.7-3.87 2.7-6.61z"
    />
    <path
      fill="#FBBC05"
      d="M3.93 10.73A5.4 5.4 0 0 1 3.64 9c0-.6.1-1.18.28-1.73L.96 4.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.97-2.31z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.25c-.8.54-1.87.91-3.06.91-2.35 0-4.36-1.58-5.07-3.72L.96 13.04C2.44 15.98 5.48 18 9 18z"
    />
  </svg>
);

export const GoogleButton = ({
  redirectTo = "/dashboard",
  label = "Continuar con Google",
}: GoogleButtonProps) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error || !data?.url) {
      setError("No hemos podido conectar con Google. Inténtalo de nuevo.");
      setPending(false);
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="group relative h-12 w-full overflow-hidden rounded-md border border-white/10 bg-ink-800/60 text-ink-50 font-medium tracking-tight transition-all duration-300 hover:border-white/20 hover:bg-ink-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2.5 text-[14px]">
          {pending ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <GoogleGlyph />
          )}
          {label}
        </span>
      </button>
      {error ? (
        <p role="alert" className="text-[12px] text-ember-400 text-center">
          {error}
        </p>
      ) : null}
    </div>
  );
};
