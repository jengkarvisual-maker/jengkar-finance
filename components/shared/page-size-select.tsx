"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  value: number | "all";
};

export function PageSizeSelect({ value }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());

    // set page size baru
    params.set("pageSize", e.target.value);

    // reset ke halaman pertama
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Tampilkan</span>

      <select
        value={String(value)}
        onChange={handleChange}
        className="h-10 rounded-md border border-border bg-white px-3 text-sm"
      >
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="all">Semua</option>
      </select>
    </div>
  );
}