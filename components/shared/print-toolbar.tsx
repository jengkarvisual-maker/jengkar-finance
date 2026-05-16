"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

type PrintToolbarProps = {
  backHref: string;
  downloadHref?: string;
};

export function PrintToolbar({ backHref, downloadHref }: PrintToolbarProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-border/70 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="metric-chip">Print Preview</div>
          <p className="text-sm text-muted-foreground">
            Gunakan tombol print browser untuk cetak atau simpan sebagai PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={backHref}>Kembali</Link>
          </Button>
          {downloadHref ? (
            <Button asChild variant="secondary">
              <a href={downloadHref}>Download PDF</a>
            </Button>
          ) : null}
          <Button type="button" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
