"use client";

import { useEffect, useRef } from "react";

/**
 * Lets the phone/browser Back button close an overlay instead of leaving the site.
 * While `open`, one history entry is added; Back removes it and calls `onClose`.
 * Closing another way (✕, Escape) removes that entry again so history stays clean.
 *
 * The history clean-up is deferred one tick so an immediate re-mount (React Strict Mode runs
 * effects twice in development) reuses the same entry instead of popping it, which used to fire
 * `popstate` on the new mount and close the overlay the moment it opened.
 */
export function useBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  const markerRef = useRef<string | null>(null);
  const pendingBackRef = useRef<number | null>(null);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (pendingBackRef.current !== null) {
      // Re-mounted straight after a clean-up: keep the history entry we already pushed.
      clearTimeout(pendingBackRef.current);
      pendingBackRef.current = null;
    }
    if (!markerRef.current) {
      markerRef.current = `overlay-${Math.random().toString(36).slice(2)}`;
      window.history.pushState({ ...(window.history.state ?? {}), overlay: markerRef.current }, "");
    }
    const marker = markerRef.current;
    let closedByBack = false;
    const onPop = () => {
      // Still on our entry (another overlay stacked above us was closed): stay open.
      if (window.history.state?.overlay === marker) return;
      closedByBack = true;
      markerRef.current = null;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (closedByBack) return;
      // Closed with ✕ or by navigation: drop our history entry if it's still on top.
      pendingBackRef.current = window.setTimeout(() => {
        pendingBackRef.current = null;
        markerRef.current = null;
        if (window.history.state?.overlay === marker) window.history.back();
      }, 0);
    };
  }, [open]);
}
