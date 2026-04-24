type Props = { status: "none" | "pending" | "accepted" };

export const PrivateGate = ({ status }: Props): React.ReactElement => {
  const message =
    status === "pending"
      ? "Has enviado una solicitud. Cuando la acepte podrás ver su actividad."
      : "Este perfil es privado. Envía una solicitud para ver su actividad.";

  return (
    <section className="mt-8 hairline rounded-2xl bg-ink-900/30 px-6 py-14 text-center">
      <LockIcon />
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
        Perfil privado
      </p>
      <p className="mt-2 text-sm text-ink-300 max-w-sm mx-auto">{message}</p>
    </section>
  );
};

const LockIcon = (): React.ReactElement => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mx-auto text-ink-500"
    aria-hidden
  >
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
