"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "cn";

export const ToastProvider = ToastPrimitive.Provider;
export const useToastManager = ToastPrimitive.useToastManager;

function ToastIcon({ type, className }: { type: string; className?: string }) {
  if (type === "success") return <CheckCircle2 className={cn(className, "text-status-allow")} strokeWidth={1.75} />;
  if (type === "error") return <XCircle className={cn(className, "text-status-block")} strokeWidth={1.75} />;
  if (type === "warning") return <AlertTriangle className={cn(className, "text-status-review")} strokeWidth={1.75} />;
  return <Info className={cn(className, "text-primary")} strokeWidth={1.75} />;
}

/** Mount once near the root, inside a ToastProvider. Renders whatever toasts useToastManager().add() creates. */
export function Toaster() {
  const { toasts } = ToastPrimitive.useToastManager();

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[100] flex w-[320px] flex-col gap-2">
        {toasts.map((toast) => (
            <ToastPrimitive.Root
              key={toast.id}
              toast={toast}
              className={cn(
                "relative flex items-start gap-2.5 rounded-[10px] border border-border bg-panel-raised p-3 text-[13px] text-foreground shadow-2xl shadow-black/40",
                "data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-all duration-150"
              )}
            >
              <ToastIcon type={toast.type ?? "info"} className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                {toast.title && <ToastPrimitive.Title className="font-medium text-foreground" />}
                {toast.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-[12.5px] text-muted-foreground" />
                )}
              </div>
              <ToastPrimitive.Close
                className="shrink-0 rounded p-0.5 text-faint-foreground hover:bg-white/[0.06] hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}
