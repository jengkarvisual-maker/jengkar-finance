"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type DeleteButtonProps = {
  action: (id: string) => Promise<{ ok: boolean; message: string }>;
  id: string;
  label?: string;
};

export function DeleteButton({
  action,
  id,
  label = "Hapus",
}: DeleteButtonProps) {
  const router = useRouter();
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
            setMessage(result.message);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        {isPending ? "Menghapus..." : label}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
