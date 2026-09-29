"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Days since epoch on the client, `null` during SSR (avoids hydration mismatch). */
export function useClientDay(): number | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => Math.floor(Date.now() / 86_400_000),
    () => null,
  );
}

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Reads a localStorage flag. Returns `serverValue` during SSR and when
 * storage is unavailable (private mode, blocked cookies).
 */
export function useStoredFlag(key: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return serverValue;
      }
    },
    () => serverValue,
  );
}

export function writeStoredFlag(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage blocked — the flag just won't persist.
  }
}
