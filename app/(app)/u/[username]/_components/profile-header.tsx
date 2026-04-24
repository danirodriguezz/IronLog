type Props = {
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  followersCount: number;
  followingCount: number;
  goal: string | null;
  age: number | null;
  weightKg: number | null;
  showBio: boolean;
  trailing?: React.ReactNode;
};

export const ProfileHeader = ({
  username,
  fullName,
  avatarUrl,
  isPublic,
  followersCount,
  followingCount,
  goal,
  age,
  weightKg,
  showBio,
  trailing,
}: Props): React.ReactElement => {
  return (
    <header className="hairline rounded-2xl bg-ink-900/40 p-5 sm:p-8">
      {/* Mobile: avatar + stats en la misma fila, nombre y botón debajo */}
      <div className="flex items-center gap-4 sm:hidden">
        <Avatar url={avatarUrl} username={username} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
              @{username}
            </span>
            {!isPublic && (
              <span
                className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-400 border border-white/10 rounded-full px-1.5 py-0.5"
                title="Perfil privado"
              >
                Privado
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-4">
            <Stat label="Seguidores" value={followersCount} />
            <span className="text-ink-700">·</span>
            <Stat label="Siguiendo" value={followingCount} />
          </div>
        </div>
      </div>

      {/* Mobile: nombre + botón debajo del bloque avatar */}
      <div className="mt-4 sm:hidden">
        {fullName && (
          <h1 className="font-display text-2xl leading-tight tracking-tight text-ink-50">
            {fullName}
          </h1>
        )}
        {trailing && <div className="mt-3">{trailing}</div>}
      </div>

      {/* Desktop: layout original horizontal */}
      <div className="hidden sm:flex items-start gap-6">
        <Avatar url={avatarUrl} username={username} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
                  @{username}
                </span>
                {!isPublic && (
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-400 border border-white/10 rounded-full px-1.5 py-0.5"
                    title="Perfil privado"
                  >
                    Privado
                  </span>
                )}
              </div>
              {fullName && (
                <h1 className="mt-1.5 font-display text-4xl leading-tight tracking-tight text-ink-50">
                  {fullName}
                </h1>
              )}
            </div>
            {trailing && <div className="shrink-0">{trailing}</div>}
          </div>

          <div className="mt-4 flex items-center gap-5 text-[13px] text-ink-300">
            <Stat label="Seguidores" value={followersCount} />
            <span className="text-ink-700">·</span>
            <Stat label="Siguiendo" value={followingCount} />
          </div>
        </div>
      </div>

      {showBio && (goal || age || weightKg) && (
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-ink-300">
          {goal && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">Objetivo</dt>
              <dd className="mt-0.5">{goal}</dd>
            </div>
          )}
          {age !== null && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">Edad</dt>
              <dd className="mt-0.5 tabular-nums">{age}</dd>
            </div>
          )}
          {weightKg !== null && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">Peso</dt>
              <dd className="mt-0.5 tabular-nums">{weightKg} kg</dd>
            </div>
          )}
        </dl>
      )}
    </header>
  );
};

const Stat = ({ label, value }: { label: string; value: number }): React.ReactElement => (
  <div className="flex items-baseline gap-1.5">
    <span className="font-display text-lg tabular-nums text-ink-50">{value}</span>
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">{label}</span>
  </div>
);

const Avatar = ({
  url,
  username,
  size,
}: {
  url: string | null;
  username: string;
  size: "sm" | "lg";
}): React.ReactElement => {
  const cls =
    size === "sm"
      ? "w-16 h-16 rounded-full shrink-0"
      : "w-24 h-24 rounded-full shrink-0";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Avatar de ${username}`}
        className={`${cls} object-cover ring-1 ring-white/10`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className={`${cls} bg-ink-800 ring-1 ring-white/10 flex items-center justify-center font-display text-ink-300 uppercase ${size === "sm" ? "text-xl" : "text-2xl"}`}
    >
      {username.slice(0, 2)}
    </div>
  );
};
