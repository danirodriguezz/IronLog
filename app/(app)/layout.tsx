import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/ui/logout-button";
import { AppNav } from "./_components/app-nav";

const AppLayout = async ({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="relative min-h-dvh bg-ink-950 text-ink-50">
      <div className="aurora opacity-30" aria-hidden />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <Logo size={24} />
              <span className="font-display text-lg leading-none">IronLog</span>
            </Link>
            <AppNav />
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
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
