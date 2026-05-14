import Link from "next/link";

import { deleteVendorBillAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { INVOICE_STATUS_OPTIONS } from "@/lib/constants";
import { toOptions } from "@/lib/options";
import { createSearchParams, readFilters } from "@/lib/search-params";
import { listVendorBills } from "@/lib/services/finance";
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

export default async function PayablesPage({
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

  const [master, bills] = await Promise.all([
    getMasterDataOptions(user),
    listVendorBills(user, filters),
  ]);
  const exportQuery = createSearchParams(rawSearchParams);
  const exportHref = exportQuery
    ? `/api/export/payables?${exportQuery}`
    : "/api/export/payables";

  return (
    <>
      <PageHeader
        eyebrow="Hutang vendor"
        title="Monitoring tagihan vendor"
        description="Pantau total tagihan, pembayaran yang sudah dilakukan, sisa hutang, jatuh tempo, dan overdue."
        action={
          <>
            <Button asChild variant="secondary">
              <Link href={exportHref}>Export CSV</Link>
            </Button>
            <Button asChild>
              <Link href="/payables/new">Tambah tagihan</Link>
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
            <TableHead>No. Tagihan</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Sudah dibayar</TableHead>
            <TableHead>Sisa</TableHead>
            <TableHead>Jatuh tempo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {bills.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.billNo}</TableCell>
              <TableCell>{row.vendor.name}</TableCell>
              <TableCell>{row.brand.name}</TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell>{formatCurrency(Number(row.totalAmount))}</TableCell>
              <TableCell>{formatCurrency(Number(row.amountPaid))}</TableCell>
              <TableCell>{formatCurrency(Number(row.outstandingAmount))}</TableCell>
              <TableCell>{formatDate(row.dueDate)}</TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/payables/${row.id}`}>Detail</Link>
                  </Button>

                  <Button asChild size="sm" variant="outline">
                    <Link href={`/payables/${row.id}/edit`}>Edit</Link>
                  </Button>

                  <DeleteButton action={deleteVendorBillAction} id={row.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
