export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-2 -8 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="6" y="10.6" width="14.2" height="6.4" rx="3.2" transform="rotate(-35 6 10.6)" fill="currentColor" />
      <rect x="-0.2" y="1.9" width="14.2" height="6.4" rx="3.2" transform="rotate(-35 -0.2 1.9)" fill="currentColor" />
    </svg>
  );
}
