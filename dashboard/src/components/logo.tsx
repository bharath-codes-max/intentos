export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="20" height="20" rx="5" fill="url(#intentos-logo-gradient)" />
      {/* checkpoint / gate mark — two posts and a passing line, evoking a governed action */}
      <path
        d="M6.5 5.5V14.5M13.5 5.5V14.5M6.5 10L9 12.2L13.5 7.6"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="intentos-logo-gradient" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7D71F0" />
          <stop offset="1" stopColor="#5B4FD1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
