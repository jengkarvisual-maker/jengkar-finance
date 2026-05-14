"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        await registration.update().catch(() => {
          // Keep app usable even if update checks fail.
        });
      })
      .catch(() => {
        // Keep app usable even if registration fails.
      });
  }, []);

  return null;
}
