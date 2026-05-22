"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type RefreshDataButtonProps = {
  label?: string;
  refreshOnFocus?: boolean;
};

const MIN_REFRESH_INTERVAL_MS = 5000;

export function RefreshDataButton({
  label = "Refresh data",
  refreshOnFocus = false,
}: RefreshDataButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const lastRefreshAt = useRef(0);

  const triggerRefresh = useCallback(() => {
    const now = Date.now();

    if (now - lastRefreshAt.current < MIN_REFRESH_INTERVAL_MS) {
      return;
    }

    lastRefreshAt.current = now;
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (!refreshOnFocus) {
      return;
    }

    const handleFocus = () => {
      triggerRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshOnFocus, triggerRefresh]);

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={triggerRefresh}
      disabled={isPending}
    >
      <RotateCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Memuat ulang..." : label}
    </Button>
  );
}
