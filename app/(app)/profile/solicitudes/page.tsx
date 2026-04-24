import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RequestRow } from "./_components/request-row";

type RequestRowData = {
  follower_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
};

const SolicitudesPage = async (): Promise<React.ReactElement> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_pending_follow_requests");

  if (error) {
    console.error("get_pending_follow_requests error:", error);
  }

  const requests = (data ?? []) as RequestRowData[];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
            Solicitudes
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight tracking-tight text-ink-50">
            Pendientes de aprobación
          </h1>
        </div>
        <Link
          href="/profile"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400 transition-colors hover:text-ink-200"
        >
          ← Mi perfil
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="hairline rounded-2xl bg-ink-900/30 px-6 py-14 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
            Sin solicitudes pendientes
          </p>
          <p className="mt-2 text-sm text-ink-300">
            Cuando alguien te solicite seguir aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <RequestRow
              key={r.follower_id}
              followerId={r.follower_id}
              username={r.username}
              fullName={r.full_name}
              avatarUrl={r.avatar_url}
              isPublic={r.is_public}
              createdAt={r.created_at}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default SolicitudesPage;
