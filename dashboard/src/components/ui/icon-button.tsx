import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type ButtonProps = React.ComponentProps<typeof Button>;

/** A Button constrained to icon-only sizes, so icon triggers stay visually consistent app-wide. */
export function IconButton({
  className,
  size = "icon-sm",
  variant = "ghost",
  ...props
}: Omit<ButtonProps, "size" | "variant"> & {
  size?: Extract<VariantProps<typeof buttonVariants>["size"], "icon" | "icon-sm" | "icon-xs" | "icon-lg">;
  variant?: VariantProps<typeof buttonVariants>["variant"];
}) {
  return <Button variant={variant} size={size} className={cn(className)} {...props} />;
}
