/** Simplified, recognizable brand marks for the coding agents Intentos integrates with.
 *  Not pixel-exact reproductions of each vendor's official asset — small inline glyphs
 *  sized for a list/dropdown, in the same spirit as any product's integrations page. */

export function ClaudeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#D97757" />
      <path
        d="M7 16.5L10.5 8h1.6l3.5 8.5h-1.7l-.75-1.9h-3.7l-.75 1.9H7Zm3.05-3.3h2.4L11.25 9.9l-1.2 3.3Z"
        fill="#191817"
      />
    </svg>
  );
}

export function CursorIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#0A0A0A" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <path d="M12 4 19 8v8l-7 4-7-4V8l7-4Z" fill="url(#cursor-g)" />
      <path d="M12 4v16M5 8l7 4 7-4" stroke="#0A0A0A" strokeWidth="0.6" />
      <defs>
        <linearGradient id="cursor-g" x1="5" y1="4" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#8a8a8a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CopilotIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#0D1117" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <path
        d="M8.2 9.5c0-1.4 1.7-2.5 3.8-2.5s3.8 1.1 3.8 2.5v3.7c0 .5-.5.9-1.1 1l-2.2.5c-.3.1-.7.1-1 0l-2.2-.5c-.6-.1-1.1-.5-1.1-1V9.5Z"
        fill="#79C0FF"
      />
      <circle cx="10.2" cy="10.3" r="0.9" fill="#0D1117" />
      <circle cx="13.8" cy="10.3" r="0.9" fill="#0D1117" />
    </svg>
  );
}

export function CodexIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#000000" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <path
        d="M12 5.2c1 0 1.9.5 2.4 1.3.9-.2 1.9.1 2.5.9.6.8.7 1.8.3 2.6.7.6 1.1 1.5 1.1 2.5s-.4 1.9-1.1 2.5c.4.8.3 1.8-.3 2.6-.6.8-1.6 1.1-2.5.9-.5.8-1.4 1.3-2.4 1.3s-1.9-.5-2.4-1.3c-.9.2-1.9-.1-2.5-.9-.6-.8-.7-1.8-.3-2.6-.7-.6-1.1-1.5-1.1-2.5s.4-1.9 1.1-2.5c-.4-.8-.3-1.8.3-2.6.6-.8 1.6-1.1 2.5-.9.5-.8 1.4-1.3 2.4-1.3Z"
        fill="#ffffff"
      />
      <circle cx="12" cy="12" r="2.1" fill="#000000" />
    </svg>
  );
}

/** Small surface-type badge, composited on the corner of a provider icon to distinguish
 *  CLI / VS Code / Desktop variants of the same provider without needing six unrelated logos. */
export function TerminalGlyph({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="16" height="16" rx="4" fill="#1a1a1a" stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" />
      <path d="M4 5.5 7 8l-3 2.5" stroke="#6ee7a8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 10.5h3.5" stroke="#6ee7a8" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function VSCodeGlyph({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="16" height="16" rx="4" fill="#1e1e1e" />
      <path
        d="M11.6 2.2 5.2 8l-2.4-1.9-1.1.6 3 3.3-3 3.3 1.1.6L5.2 12l6.4 5.8 3.2-1.5V3.7l-3.2-1.5Zm0 3.1v9.4L6.9 9.9l4.7-4.6Z"
        fill="#0098FF"
        transform="translate(0.5 -1)"
      />
    </svg>
  );
}

export function DesktopAppGlyph({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="16" height="16" rx="4" fill="#3a3a3a" stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" />
      <rect x="3" y="4" width="10" height="6.5" rx="1" stroke="#e5e5e5" strokeWidth="1.1" />
      <path d="M6 13h4M8 10.5V13" stroke="#e5e5e5" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

/** Provider mark with a small surface-type badge in the corner. */
export function SurfaceIcon({
  provider,
  surface,
  size = 20,
}: {
  provider: "claude" | "codex";
  surface: "cli" | "vscode" | "desktop";
  size?: number;
}) {
  const ProviderIcon = provider === "claude" ? ClaudeIcon : CodexIcon;
  const SurfaceBadge = surface === "cli" ? TerminalGlyph : surface === "vscode" ? VSCodeGlyph : DesktopAppGlyph;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ProviderIcon size={size} />
      <div className="absolute -right-1 -bottom-1">
        <SurfaceBadge size={Math.round(size * 0.5)} />
      </div>
    </div>
  );
}
