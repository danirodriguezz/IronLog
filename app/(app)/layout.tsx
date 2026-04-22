import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "./_components/app-nav";

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
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
