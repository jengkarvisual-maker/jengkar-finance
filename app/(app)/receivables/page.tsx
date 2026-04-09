import Link from "next/link";

import { deleteInvoiceAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { INVOICE_STATUS_OPTIONS } from "@/lib/constants";
import { readFilters } from "@/lib/search-params";
import { listInvoices } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const rawSearchParams = await searchParams;
  const filters = readFilters(rawSearchParams);

  const defaultValues = {
    q: getSingleValue(rawSearchParams.q) ?? "",
    brandId: getSingleValue(rawSearchParams.brandId) ?? "",
    from: getSingleValue(rawSearchParams.from) ?? "",
    to: getSingleValue(rawSearchParams.to) ?? "",
    status: getSingleValue(rawSearchParams.status) ?? "",
  };

  const [master, receivables] = await Promise.all([
    getMasterDataOptions(user),
    listInvoices(user, filters),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Piutang klien"
        title="Monitoring invoice dan sisa tagihan"
        description="Pantau invoice per project, sisa tagihan, status payment, dan overdue secara otomatis."
        action={
          <>
            <Button asChild variant="secondary">
              <Link href="/api/export/receivables">Export CSV</Link>
            </Button>
            <Button asChild>
              <Link href="/receivables/new">Tambah invoice</Link>
            </Button>
          </>
        }
      />

      <form
        method="GET"
        className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-border/70 bg-white/75 p-4"
      >
        <input
          type="text"
          name="q"
          defaultValue={defaultValues.q}
          placeholder="Cari nomor, deskripsi, client, vendor, atau project"
          className="min-w-[260px] flex-1 rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none"
        />

        <select
          name="brandId"
          defaultValue={defaultValues.brandId}
          className="min-w-[180px] rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none"
        >
          <option value="">Semua brand</option>
          {master.brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="from"
          defaultValue={defaultValues.from}
          className="rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none"
        />

        <input
          type="date"
          name="to"
          defaultValue={defaultValues.to}
          className="rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none"
        />

        <select
          name="status"
          defaultValue={defaultValues.status}
          className="min-w-[220px] rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none"
        >
          <option value="">Semua status pembayaran</option>
          {INVOICE_STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <Button type="submit">Terapkan</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Klien</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>DP</TableHead>
            <TableHead>Sisa</TableHead>
            <TableHead>Jatuh tempo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receivables.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{row.invoiceNo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(row.invoiceDate)}
                  </p>
                </div>
              </TableCell>
              <TableCell>{row.brand.name}</TableCell>
              <TableCell>{row.client.name}</TableCell>
              <TableCell>{row.project?.name ?? "-"}</TableCell>
              <TableCell>{formatCurrency(Number(row.totalAmount))}</TableCell>
              <TableCell>{formatCurrency(Number(row.downPayment))}</TableCell>
              <TableCell>{formatCurrency(Number(row.outstandingAmount))}</TableCell>
              <TableCell>{formatDate(row.dueDate)}</TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/receivables/${row.id}`}>Detail</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/receivables/${row.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteButton action={deleteInvoiceAction} id={row.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}