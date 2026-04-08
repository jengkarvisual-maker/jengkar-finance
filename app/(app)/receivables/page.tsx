import Link from "next/link";

import { deleteInvoiceAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { INVOICE_STATUS_OPTIONS } from "@/lib/constants";
import { toOptions } from "@/lib/options";
import { readFilters } from "@/lib/search-params";
import { listInvoices } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { QueryFilters } from "@/components/shared/query-filters";
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

  const defaultValues: Record<string, string | undefined> = {
    brandId: getSingleValue(rawSearchParams.brandId),
    projectId: getSingleValue(rawSearchParams.projectId),
    accountCategory: getSingleValue(rawSearchParams.accountCategory),
    from: getSingleValue(rawSearchParams.from),
    to: getSingleValue(rawSearchParams.to),
    month: getSingleValue(rawSearchParams.month),
    pageSize: getSingleValue(rawSearchParams.pageSize),
    status: getSingleValue(rawSearchParams.status),
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

      <QueryFilters
        brandOptions={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        statusOptions={INVOICE_STATUS_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        defaultValues={defaultValues}
      />

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