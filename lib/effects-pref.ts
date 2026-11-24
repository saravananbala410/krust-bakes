"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's own choice to turn festive motion off (falling particles, fireworks, the scroll
 * intro, tap sparkles, swaying decorations). Remembered in this browser only. The system
 * "reduce motion" setting turns motion off as well.
 */
const KEY = "krust-effects";
const EVENT = "krust-effects-change";
/** Used when storage is blocked, so the switch still works until the page reloads. */
let memory: boolean | null = null;

function read(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (memory !== null) return memory;
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  addEventListener(EVENT, onChange);
  addEventListener("storage", onChange);
  media.addEventListener("change", onChange);
  return () => { removeEventListener(EVENT, onChange); removeEventListener("storage", onChange); media.removeEventListener("change", onChange); };
}

/** True while festive motion may play. False during server render, so nothing animates before hydration. */
export function useEffectsOn() {
  return useSyncExternalStore(subscribe, read, () => false);
}

export function setEffectsOn(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); memory = null; } catch { memory = on; }
  dispatchEvent(new Event(EVENT));
}
