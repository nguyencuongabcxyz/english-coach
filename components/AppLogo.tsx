/** Brand mark: a speech bubble with an "E" whose arms are sound waves (same art as app/icon.svg). */
export function AppLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path
        d="M14 4h36a10 10 0 0 1 10 10v28a10 10 0 0 1-10 10H27l-11 9v-9h-2A10 10 0 0 1 4 42V14A10 10 0 0 1 14 4z"
        fill="#4F55D8"
      />
      <g fill="none" strokeWidth="6.5" strokeLinecap="round">
        <path d="M19 16h22" stroke="#FFFFFF" />
        <path d="M19 28h15" stroke="#A9E3C6" />
        <path d="M19 40h25" stroke="#FBE5BC" />
        <path d="M51 23v10" stroke="#F6CBBF" />
        <path d="M19 16v24" stroke="#FFFFFF" />
      </g>
    </svg>
  );
}
