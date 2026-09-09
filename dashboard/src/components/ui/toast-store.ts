"use client";

import { useSyncExternalStore } from "react";

export type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
};

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function addToast(t: Omit<ToastItem, "id">): string {
  const id = crypto.randomUUID();
  toasts = [...toasts, { duration: 5000, ...t, id }];
  emit();
  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return toasts;
}

const EMPTY: ToastItem[] = [];
function getServerSnapshot() {
  return EMPTY;
}

/** Imperative API + reactive subscription for the mounted <Toaster />. */
export function useToastManager() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { toasts: list, add: addToast, remove: removeToast };
}
