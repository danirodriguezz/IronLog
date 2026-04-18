type LogoProps = {
  className?: string;
  size?: number;
};

export const Logo = ({ className, size = 28 }: LogoProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden
  >
    <defs>
      <linearGradient id="ironlog-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--color-mineral-300)" />
        <stop offset="100%" stopColor="var(--color-mineral-600)" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="30" height="30" rx="9" stroke="url(#ironlog-g)" strokeWidth="1.5" />
    <path
      d="M9 12.5h2v7H9zm12 0h2v7h-2zM7 15h2v2H7zm16 0h2v2h-2zm-11 .25h8v1.5h-8z"
      fill="url(#ironlog-g)"
    />
  </svg>
);
