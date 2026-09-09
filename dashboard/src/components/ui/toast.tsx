"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircledIcon, ExclamationTriangleIcon, CrossCircledIcon, InfoCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import { cn } from "cn";
import { useToastManager, removeToast, type ToastItem } from "./toast-store";

export const ToastProvider = ToastPrimitive.Provider;
export { addToast, useToastManager } from "./toast-store";

function ToastIcon({ type, className }: { type?: ToastItem["type"]; className?: string }) {
  if (type === "success") return <CheckCircledIcon className={cn(className, "text-status-allow")} />;
  if (type === "error") return <CrossCircledIcon className={cn(className, "text-status-block")} />;
  if (type === "warning") return <ExclamationTriangleIcon className={cn(className, "text-status-review")} />;
  return <InfoCircledIcon className={cn(className, "text-primary")} />;
}

/** Mount once near the root, inside a Radix ToastProvider. Renders whatever addToast() creates. */
export function Toaster() {
  const { toasts } = useToastManager();

  return (
    <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[100] flex w-[320px] flex-col gap-2 outline-none">
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          duration={toast.duration}
          onOpenChange={(open) => {
            if (!open) removeToast(toast.id);
          }}
          className={cn(
            "relative flex items-start gap-2.5 rounded-[10px] border border-border bg-panel-raised p-3 text-[13px] text-foreground shadow-2xl shadow-black/40",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-1 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]"
          )}
        >
          <ToastIcon type={toast.type} className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            {toast.title && <ToastPrimitive.Title className="font-medium text-foreground">{toast.title}</ToastPrimitive.Title>}
            {toast.description && (
              <ToastPrimitive.Description className="mt-0.5 text-[12.5px] text-muted-foreground">
                {toast.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close
            className="shrink-0 rounded p-0.5 text-faint-foreground hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Dismiss"
          >
            <Cross2Icon className="size-3.5" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
    </ToastPrimitive.Viewport>
  );
}
