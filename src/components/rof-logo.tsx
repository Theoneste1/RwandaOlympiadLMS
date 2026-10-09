/**
 * Recreated geometric mark from the Foundation's logo (circular badge with a
 * white pinwheel monogram). Not a pixel trace of the source artwork — an SVG
 * approximation built from simple shapes so it scales cleanly everywhere.
 */
export function RofMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Rwanda Olympiad Foundation"
    >
      <circle cx="50" cy="50" r="50" fill="#0891b2" />
      <path d="M50 16 A34 34 0 0 1 16 50 L50 50 Z" fill="#fff" />
      <path d="M16 50 L50 50 L50 84 Z" fill="#fff" />
      <path d="M50 50 L84 50 A34 34 0 0 1 61 83 L50 72 Z" fill="#fff" />
      <circle cx="50" cy="50" r="9" fill="#fff" />
    </svg>
  );
}

export function RofLogo({ size = 32, className, wordmarkClassName }: { size?: number; className?: string; wordmarkClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <RofMark size={size} />
      <span className={`font-black leading-tight tracking-tight ${wordmarkClassName ?? ""}`}>
        Rwanda Olympiad Foundation
      </span>
    </span>
  );
}
