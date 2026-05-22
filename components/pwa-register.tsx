"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const unregisterLegacyPwa = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map((registration) =>
          registration.unregister().catch(() => false),
        ),
      );

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys
            .filter((key) => key.startsWith("rj-finance-"))
            .map((key) => caches.delete(key).catch(() => false)),
        );
      }
    };

    void unregisterLegacyPwa().catch(() => {
      // Keep app usable even if cleanup fails.
    });
  }, []);

  return null;
}
