"use client";

import { useEffect } from "react";

// Registered from the root layout so it covers /login too, not just the
// main app page.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a nice-to-have, not a hard requirement -- a
        // failed registration (e.g. unsupported browser) shouldn't be
        // surfaced as an app error.
      });
    }
  }, []);

  return null;
}
