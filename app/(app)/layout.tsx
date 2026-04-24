import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "./_components/app-nav";
import { NotificationsListener } from "./_components/notifications-listener";
import { ToastContainer } from "./_components/toast-container";

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

  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id)
    .eq("status", "pending");

  return (
    <div className="relative min-h-dvh bg-ink-950 text-ink-50">
      <div className="aurora opacity-30" aria-hidden />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <AppHeader pendingRequests={count ?? 0} />
        <main className="flex-1">{children}</main>
      </div>
      <NotificationsListener currentUserId={user.id} />
      <ToastContainer />
    </div>
  );
};

export default AppLayout;
