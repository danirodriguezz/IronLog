type StatCardProps = {
  eyebrow: string;
  headline: string;
  hint: string;
};

export const StatCard = ({
  eyebrow,
  headline,
  hint,
}: StatCardProps): React.ReactElement => (
  <article className="group relative overflow-hidden rounded-2xl hairline bg-ink-900/50 p-6 transition-colors hover:bg-ink-900/70">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
    />
    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-300">
      {eyebrow}
    </p>
    <p className="mt-4 font-display text-3xl leading-none tracking-tight text-ink-50">
      {headline}
    </p>
    <p className="mt-4 text-sm text-ink-200">{hint}</p>
  </article>
);
