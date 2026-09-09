export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect
        x="7.6"
        y="1.2"
        width="14.2"
        height="6.4"
        rx="3.2"
        transform="rotate(35 7.6 1.2)"
        fill="url(#intentos-logo-a)"
      />
      <rect
        x="-1.2"
        y="10.9"
        width="14.2"
        height="6.4"
        rx="3.2"
        transform="rotate(35 -1.2 10.9)"
        fill="url(#intentos-logo-b)"
      />
      <defs>
        <linearGradient id="intentos-logo-a" x1="7.6" y1="1.2" x2="21.8" y2="7.6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="intentos-logo-b" x1="-1.2" y1="10.9" x2="13" y2="17.3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#4ADE80" />
        </linearGradient>
      </defs>
    </svg>
  );
}
