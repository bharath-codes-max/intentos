"use client";

import { useSyncExternalStore } from "react";

const KEY = "intentos_sidebar_collapsed";
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function setSidebarCollapsed(next: boolean) {
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {}
  emit();
}

/** Persisted sidebar collapse state, synced across renders without a hydration-mismatching effect. */
export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
