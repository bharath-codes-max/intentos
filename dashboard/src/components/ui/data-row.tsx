import { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A dense, clickable list row — the non-tabular counterpart to Table/TableRow, for surfaces like
 * Approvals and Agent Activity where each item needs more than a table cell's worth of content
 * (an icon, a stacked title+meta block, trailing badges) but should still read as one consistent
 * row language across the app rather than each page inventing its own div structure.
 */
export function DataRow({
  icon,
  iconTone = "default",
  iconColor,
  children,
  trailing,
  href,
  onClick,
  className,
}: {
  icon?: ReactNode;
  iconTone?: "default" | "allow" | "review" | "block";
  /** When set, colors the icon glyph itself (no background fill) — the "all icons colored" treatment. */
  iconColor?: string;
  children: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const toneClass =
    iconTone === "allow"
      ? "text-status-allow"
      : iconTone === "review"
        ? "text-status-review"
        : iconTone === "block"
          ? "text-status-block"
          : "text-faint-foreground";

  const rowClassName = cn(
    "group/row relative flex items-center gap-3 px-4 py-2.5 transition-colors duration-150",
    (href || onClick) && "cursor-pointer hover:bg-white/[0.035]",
    className
  );

  const content = (
    <>
      {icon && (
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md bg-white/[0.05]",
            !iconColor && toneClass,
            iconColor && "[&_svg]:!text-[var(--icon-color)]"
          )}
          style={iconColor ? ({ "--icon-color": iconColor } as CSSProperties) : undefined}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {trailing && <div className="ml-auto flex shrink-0 items-center gap-3">{trailing}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClassName}>
        {content}
      </Link>
    );
  }
  return (
    <div onClick={onClick} className={rowClassName}>
      {content}
    </div>
  );
}
