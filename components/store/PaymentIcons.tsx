type IconProps = { size?: number; className?: string };

export function CashIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect x="2.5" y="6" width="19" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 9.5h1.8M5.5 14.5h1.8M16.7 9.5h1.8M16.7 14.5h1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** סמל מזוהה של אפליקציית ביט (כחול + ביט) */
export function BitIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      role="img"
    >
      <rect x="1" y="3" width="22" height="18" rx="6" fill="#0057FF" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fill="#fff"
        fontSize="8.5"
        fontWeight="700"
        fontFamily="Arial, 'Segoe UI', sans-serif"
      >
        ביט
      </text>
    </svg>
  );
}
