"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  page: number;
  pageSize: number | "all";
  total: number;
};

export function PaginationControls({ page, pageSize, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pageSize === "all") return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Menampilkan {start}-{end} dari {total} transaksi
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="button-press rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          Prev
        </button>

        <span className="text-sm">
          Halaman {page} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="button-press rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
