import { TerminalSquare, FilePenLine, FileText, GitBranch, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/** Maps a real tool_name to a distinct icon so list rows are scannable at a glance — not decorative. */
function iconFor(toolName: string) {
  const name = toolName.toLowerCase();
  if (name === "bash" || name.includes("exec")) return TerminalSquare;
  if (name === "write" || name === "apply_patch" || name.includes("edit")) return FilePenLine;
  if (name === "read") return FileText;
  if (name.includes("git")) return GitBranch;
  return Wrench;
}

export function ToolIcon({ toolName, className }: { toolName: string; className?: string }) {
  const Icon = iconFor(toolName);
  return <Icon className={cn("size-3.5 shrink-0 text-faint-foreground", className)} strokeWidth={1.75} />;
}
