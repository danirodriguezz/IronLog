"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/ui/logout-button";

type NavItem = {
  href: string;
  label: string;
  disabled?: boolean;
};

const ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Panel" },
  { href: "/rutinas", label: "Rutinas" },
  { href: "/entrenar", label: "Entrenar" },
  { href: "/progreso", label: "Progreso" },
] as const;

export const AppHeader = (): React.ReactElement => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/6 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <Logo size={24} />
            <span className="font-display text-lg leading-none">IronLog</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-1">
            {ITEMS.map(({ href, label, disabled }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);

              if (disabled) {
                return (
                  <span
                    key={href}
                    aria-disabled
                    title="Próximamente"
                    className="cursor-not-allowed rounded-full px-3 py-1.5 text-[13px] text-ink-300"
                  >
                    {label}
                  </span>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                    active
                      ? "bg-ink-800/70 text-ink-50 hairline"
                      : "text-ink-200 hover:text-ink-50 hover:bg-ink-800/40"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: profile + logout (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              title="Mi perfil"
              className="flex items-center justify-center rounded-full w-8 h-8 bg-ink-700 hover:bg-ink-600 transition-colors ring-1 ring-white/10 hover:ring-white/20"
              aria-label="Ir a mi perfil"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-100">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </Link>
            <div className="hidden md:block">
              <LogoutButton />
            </div>

            {/* Hamburger button — mobile only */}
            <button
              type="button"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full text-ink-200 hover:text-ink-50 hover:bg-ink-800/40 transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden
              >
                <line
                  x1="2" y1="4.5" x2="16" y2="4.5"
                  className={`transition-all duration-300 ${open ? "opacity-0" : ""}`}
                />
                <line
                  x1="2" y1="9" x2="16" y2="9"
                  className={`transition-all duration-200 ${open ? "opacity-0" : ""}`}
                />
                <line
                  x1="2" y1="13.5" x2="16" y2="13.5"
                  className={`transition-all duration-300 ${open ? "opacity-0" : ""}`}
                />
                {open && (
                  <>
                    <line x1="3" y1="3" x2="15" y2="15" />
                    <line x1="15" y1="3" x2="3" y2="15" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile drawer */}
      <nav
        id="mobile-menu"
        aria-label="Navegación móvil"
        className={`fixed top-0 right-0 z-40 h-full w-72 bg-ink-950 border-l border-white/8 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
            Menú
          </span>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-full text-ink-300 hover:text-ink-50 hover:bg-ink-800/40 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col flex-1 py-2">
          {ITEMS.map(({ href, label, disabled }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            if (disabled) {
              return (
                <span
                  key={href}
                  aria-disabled
                  title="Próximamente"
                  className="px-6 py-4 text-[13px] font-mono uppercase tracking-[0.18em] text-ink-500 border-b border-white/5"
                >
                  {label}
                </span>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`px-6 py-4 text-[13px] font-mono uppercase tracking-[0.18em] transition-colors border-b border-white/5 ${
                  active ? "text-mineral-400" : "text-ink-200 hover:text-ink-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="px-6 py-5 border-t border-white/6">
          <LogoutButton />
        </div>
      </nav>
    </>
  );
};

