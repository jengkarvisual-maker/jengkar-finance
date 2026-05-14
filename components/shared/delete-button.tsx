"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type DeleteButtonProps = {
  action: (id: string) => Promise<{ ok: boolean; message: string }>;
  id: string;
  label?: string;
  redirectTo?: string;
};

export function DeleteButton({
  action,
  id,
  label = "Hapus",
  redirectTo,
}: DeleteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          const confirmed = window.confirm("Yakin ingin menghapus data ini?");
          if (!confirmed) {
            return;
          }

          startTransition(async () => {
            const result = await action(id);
            if (result.ok) {
              setMessage(null);

              if (redirectTo && redirectTo !== pathname) {
                router.push(redirectTo);
                return;
              }

              router.refresh();
              return;
            }

            setMessage(result.message);
          });
        }}
      >
        {isPending ? "Menghapus..." : label}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
