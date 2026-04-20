"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  disabled?: boolean;
};

const ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Panel" },
  { href: "/rutinas", label: "Rutinas" },
  { href: "/entrenar", label: "Entrenar", disabled: true },
  { href: "/progreso", label: "Progreso", disabled: true },
] as const;

export const AppNav = (): React.ReactElement => {
  const pathname = usePathname();

  return (
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
  );
};
