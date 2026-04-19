type SeparatorProps = {
  label?: string;
};

export const Separator = ({ label = "o" }: SeparatorProps) => (
  <div className="relative flex items-center gap-3">
    <div className="flex-1 h-px bg-white/10" />
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-300">
      {label}
    </span>
    <div className="flex-1 h-px bg-white/10" />
  </div>
);
