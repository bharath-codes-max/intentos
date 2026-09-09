import { TerminalSquare, FilePenLine, FileText, GitBranch, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/** Maps a real tool_name to a distinct icon so list rows are scannable at a glance — not decorative. */
export function ToolIcon({ toolName, className }: { toolName: string; className?: string }) {
  const iconClassName = cn("size-3.5 shrink-0 text-faint-foreground", className);
  const name = toolName.toLowerCase();

  if (name === "bash" || name.includes("exec")) return <TerminalSquare className={iconClassName} strokeWidth={1.75} />;
  if (name === "write" || name === "apply_patch" || name.includes("edit"))
    return <FilePenLine className={iconClassName} strokeWidth={1.75} />;
  if (name === "read") return <FileText className={iconClassName} strokeWidth={1.75} />;
  if (name.includes("git")) return <GitBranch className={iconClassName} strokeWidth={1.75} />;
  return <Wrench className={iconClassName} strokeWidth={1.75} />;
}
