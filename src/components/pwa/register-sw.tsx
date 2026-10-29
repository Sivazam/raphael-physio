"use client";

import { useEffect } from "react";

/**
 * Registers the site service worker (`/sw.js`).
 *
 * Deliberately conservative:
 *  - only when the browser actually supports service workers;
 *  - only on HTTPS (the secure-context requirement) or localhost/127.0.0.1
 *    during development;
 *  - after the window `load` event so registration never competes with
 *    first-paint resources;
 *  - registration failures are silent and non-fatal — the site works
 *    perfectly as a normal website without the worker.
 *
 * Renders nothing. (Wiring it into the site layout is the orchestrator's
 * call — see the worklog, task 4-g.)
 */
export function RegisterSw() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const { protocol, hostname } = window.location;
    const isLocalDev =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    if (protocol !== "https:" && !isLocalDev) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal by design: no offline support this visit.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
