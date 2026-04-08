import type { Prisma } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { QueryFilters } from "@/components/shared/query-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import {
  ACCOUNT_CATEGORY_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "@/lib/constants";
import { toOptions } from "@/lib/options";
import { readFilters } from "@/lib/search-params";
import { listTransactions } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency, formatDate } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type TransactionReportRow = Prisma.TransactionGetPayload<{
  include: {
    brand: true;
    category: true;
    account: true;
    client: true;
    vendor: true;
    project: true;
    paymentMethod: true;
    enteredBy: true;
  };
}>;

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function TransactionReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const filters = readFilters(resolvedSearchParams);

  const [master, report] = await Promise.all([
    getMasterDataOptions(user),
    listTransactions(user, filters),
  ]);

  const rows = report.rows as TransactionReportRow[];

  const defaultValues: Record<string, string | undefined> = {
    brandId: getSingleValue(resolvedSearchParams.brandId),
    status: getSingleValue(resolvedSearchParams.status),
    category: getSingleValue(resolvedSearchParams.category),
    page: getSingleValue(resolvedSearchParams.page),
    pageSize: getSingleValue(resolvedSearchParams.pageSize),
  };

  return (
    <>
      <PageHeader
        eyebrow="Laporan"
        title="Rekap transaksi"
        description="Laporan transaksi berdasarkan range tanggal, brand, dan kata kunci pencarian."
      />

      <QueryFilters
        brandOptions={toOptions(
          master.brands,
          (item) => item.id,
          (item) => item.name,
        )}
        statusOptions={PAYMENT_STATUS_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        categoryOptions={ACCOUNT_CATEGORY_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        defaultValues={defaultValues}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>No. Transaksi</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Masuk</TableHead>
            <TableHead>Keluar</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{formatDate(row.transactionDate)}</TableCell>
              <TableCell className="font-medium">{row.transactionNo}</TableCell>
              <TableCell>{row.brand.name}</TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell>{formatCurrency(Number(row.amountIn))}</TableCell>
              <TableCell>{formatCurrency(Number(row.amountOut))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}