"use client";

import { useEffect, useRef } from "react";

/**
 * Lets the phone/browser Back button close an overlay instead of leaving the site.
 * While `open`, one history entry is added; Back removes it and calls `onClose`.
 * Closing another way (✕, Escape) removes that entry again so history stays clean.
 */
export function useBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const marker = `overlay-${Math.random().toString(36).slice(2)}`;
    window.history.pushState({ ...(window.history.state ?? {}), overlay: marker }, "");
    let closedByBack = false;
    const onPop = () => { closedByBack = true; closeRef.current(); };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed with ✕ or by navigation: drop our history entry if it's still on top.
      if (!closedByBack && window.history.state?.overlay === marker) window.history.back();
    };
  }, [open]);
}
