import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./_components/profile-form";

type Profile = {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  age: number | null;
  weight_kg: number | null;
  goal: string | null;
  is_public: boolean;
};

const ProfilePage = async (): Promise<React.ReactElement> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileRes, sessionsRes, followersRes, followingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, full_name, avatar_url, age, weight_kg, goal, is_public")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .not("ended_at", "is", null),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id),
  ]);

  if (!profileRes.data) redirect("/login");

  const profile = profileRes.data;
  const sessions = sessionsRes.count ?? 0;
  const followers = followersRes.count ?? 0;
  const following = followingRes.count ?? 0;

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      {/* ── Header ── */}
      <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="relative shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? profile.username}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink-600 ring-2 ring-white/10">
              <span className="font-display text-2xl text-ink-100">{initials}</span>
            </div>
          )}
          {profile.is_public ? null : (
            <span
              title="Perfil privado"
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-800 ring-2 ring-ink-950"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-200">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
          )}
        </div>

        {/* Name / username */}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
            {profile.full_name ?? profile.username}
          </h1>
          <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.22em] text-ink-300">
            @{profile.username}
          </p>
          {profile.goal ? (
            <p className="mt-2 max-w-sm text-sm text-ink-200">{profile.goal}</p>
          ) : null}
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        aria-label="Estadísticas"
        className="mt-8 grid grid-cols-3 divide-x divide-white/[0.07] rounded-2xl hairline bg-ink-900/50"
      >
        {(
          [
            { label: "Entrenos", value: sessions },
            { label: "Seguidores", value: followers },
            { label: "Siguiendo", value: following },
          ] as const
        ).map(({ label, value }) => (
          <div key={label} className="px-5 py-5 text-center">
            <p className="font-display text-3xl leading-none tracking-tight">{value}</p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-300">
              {label}
            </p>
          </div>
        ))}
      </section>

      {/* ── Edit form ── */}
      <section className="mt-12">
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300">
            Tu perfil
          </p>
          <h2 className="mt-2 font-display text-3xl leading-tight">
            Editar información
          </h2>
          <p className="mt-1.5 text-sm text-ink-200">
            Actualiza tus datos personales. El nombre de usuario debe ser único.
          </p>
        </div>

        <div className="hairline rounded-2xl bg-ink-900/40 p-6 md:p-8">
          <ProfileForm profile={profile} />
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
