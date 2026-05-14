import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Option = {
  label: string;
  value: string;
};

type QueryFiltersProps = {
  brandOptions?: Option[];
  statusOptions?: Option[];
  categoryOptions?: Option[];
  defaultValues?: Record<string, string | undefined>;
  actionHref?: string;
};

export function QueryFilters({
  brandOptions = [],
  statusOptions = [],
  categoryOptions = [],
  defaultValues = {},
}: QueryFiltersProps) {
  const statusFilter =
    statusOptions.length > 0 ? (
      <Select
        name="status"
        defaultValue={defaultValues.status}
        placeholder="Semua status"
        options={statusOptions}
      />
    ) : categoryOptions.length > 0 ? (
      <Select
        name="accountCategory"
        defaultValue={defaultValues.accountCategory}
        placeholder="Semua kategori"
        options={categoryOptions}
      />
    ) : (
      <div />
    );

  const categoryFilter =
    statusOptions.length > 0 && categoryOptions.length > 0 ? (
      <Select
        name="accountCategory"
        defaultValue={defaultValues.accountCategory}
        placeholder="Semua kategori"
        options={categoryOptions}
      />
    ) : (
      <div />
    );

  return (
    <form className="grid gap-3 rounded-[28px] border border-border/70 bg-white/70 p-4 md:grid-cols-2 xl:grid-cols-[1.6fr_repeat(5,1fr)_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          name="query"
          defaultValue={defaultValues.query}
          placeholder="Cari nomor, deskripsi, client, vendor, atau project"
          className="pl-11"
        />
      </div>
      {brandOptions.length > 0 ? (
        <Select
          name="brandId"
          defaultValue={defaultValues.brandId}
          placeholder="Semua brand"
          options={brandOptions}
        />
      ) : (
        <div />
      )}
      <Input name="from" type="date" defaultValue={defaultValues.from} />
      <Input name="to" type="date" defaultValue={defaultValues.to} />
      {statusFilter}
      {categoryFilter}
      <Button type="submit">Terapkan</Button>
    </form>
  );
}
