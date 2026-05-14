import Link from "next/link";

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
import { requireUser } from "@/lib/auth/session";
import { INVOICE_STATUS_OPTIONS } from "@/lib/constants";
import { toOptions } from "@/lib/options";
import { createSearchParams, readFilters } from "@/lib/search-params";
import { listInvoices } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency, formatDate } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ReceivableReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const filters = readFilters(resolvedSearchParams);

  const [master, report] = await Promise.all([
    getMasterDataOptions(user),
    listInvoices(user, filters),
  ]);
  const exportQuery = createSearchParams(resolvedSearchParams);
  const exportHref = exportQuery
    ? `/api/export/receivables?${exportQuery}`
    : "/api/export/receivables";

  const defaultValues: Record<string, string | undefined> = {
    brandId: getSingleValue(resolvedSearchParams.brandId),
    status: getSingleValue(resolvedSearchParams.status),
    query:
      getSingleValue(resolvedSearchParams.query) ??
      getSingleValue(resolvedSearchParams.q) ??
      getSingleValue(resolvedSearchParams.search),
    from: getSingleValue(resolvedSearchParams.from),
    to: getSingleValue(resolvedSearchParams.to),
  };

  return (
    <>
      <PageHeader
        eyebrow="Laporan"
        title="Rekap piutang"
        description="Filter invoice berdasarkan brand, status, dan periode untuk follow-up collection."
        action={
          <Button asChild variant="secondary">
            <Link href={exportHref}>Export CSV</Link>
          </Button>
        }
      />

      <QueryFilters
        brandOptions={toOptions(
          master.brands,
          (item) => item.id,
          (item) => item.name
        )}
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
            <TableHead>Total</TableHead>
            <TableHead>Outstanding</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {report.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.invoiceNo}</TableCell>
              <TableCell>{row.brand.name}</TableCell>
              <TableCell>{row.client.name}</TableCell>
              <TableCell>{formatCurrency(Number(row.totalAmount))}</TableCell>
              <TableCell>
                {formatCurrency(Number(row.outstandingAmount))}
              </TableCell>
              <TableCell>{formatDate(row.dueDate)}</TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
