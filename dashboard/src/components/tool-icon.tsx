import { CodeIcon, Pencil2Icon, FileTextIcon, CommitIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

/** Maps a real tool_name to a distinct icon so list rows are scannable at a glance — not decorative. */
export function ToolIcon({ toolName, className }: { toolName: string; className?: string }) {
  const iconClassName = cn("size-[14px] shrink-0 text-faint-foreground", className);
  const name = toolName.toLowerCase();

  if (name === "bash" || name.includes("exec")) return <CodeIcon className={iconClassName} />;
  if (name === "write" || name === "apply_patch" || name.includes("edit")) return <Pencil2Icon className={iconClassName} />;
  if (name === "read") return <FileTextIcon className={iconClassName} />;
  if (name.includes("git")) return <CommitIcon className={iconClassName} />;
  return <LightningBoltIcon className={iconClassName} />;
}
