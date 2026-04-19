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

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Atleta";

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
              <span
                className="hidden sm:inline font-mono text-[11px] uppercase tracking-[0.22em] text-ink-200"
                title={user.email ?? undefined}
              >
                {displayName}
              </span>
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
