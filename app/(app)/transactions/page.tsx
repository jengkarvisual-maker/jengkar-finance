import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { PageSizeSelect } from "@/components/shared/page-size-select";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { QueryFilters } from "@/components/shared/query-filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteTransactionAction } from "@/lib/actions/finance";
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

type TransactionRow = Prisma.TransactionGetPayload<{
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

function getPage(value: string | string[] | undefined): number {
  const raw = getSingleValue(value);
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function getPageSize(
  value: string | string[] | undefined,
): number | "all" {
  const raw = getSingleValue(value);

  if (raw === "all") {
    return "all";
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 10;
  }

  return Math.floor(parsed);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const filters = readFilters(resolvedSearchParams);

  const currentPage = getPage(resolvedSearchParams.page);
  const currentPageSize = getPageSize(resolvedSearchParams.pageSize);

  const [master, transactions] = await Promise.all([
    getMasterDataOptions(user),
    listTransactions(user, filters),
  ]);

  const rows = transactions.rows as TransactionRow[];

  const defaultValues: Record<string, string | undefined> = {
    brandId: getSingleValue(resolvedSearchParams.brandId),
    status: getSingleValue(resolvedSearchParams.status),
    category: getSingleValue(resolvedSearchParams.category),
    page: getSingleValue(resolvedSearchParams.page),
    pageSize: getSingleValue(resolvedSearchParams.pageSize),
    q: getSingleValue(resolvedSearchParams.q),
    query: getSingleValue(resolvedSearchParams.query),
    search: getSingleValue(resolvedSearchParams.search),
    from: getSingleValue(resolvedSearchParams.from),
    to: getSingleValue(resolvedSearchParams.to),
  };

  return (
    <>
      <PageHeader
        eyebrow="Manajemen transaksi"
        title="Transaksi keuangan harian"
        description="Input dan monitor seluruh pemasukan, pengeluaran, DP, pelunasan, biaya produksi, serta pembayaran vendor per brand."
        action={
          <>
            <Button asChild variant="secondary">
              <Link href="/api/export/transactions">Export CSV</Link>
            </Button>
            <Button asChild>
              <Link href="/transactions/new">Tambah transaksi</Link>
            </Button>
          </>
        }
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

      <Card className="border-border/70 bg-white/80">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">
              Total pemasukan halaman ini
            </p>
            <p className="text-2xl font-semibold">
              {formatCurrency(transactions.totals.amountIn)}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Total pengeluaran halaman ini
            </p>
            <p className="text-2xl font-semibold">
              {formatCurrency(transactions.totals.amountOut)}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Jumlah baris</p>
            <p className="text-2xl font-semibold">{transactions.total}</p>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Transaksi</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Pihak</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Keluar</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.transactionDate)}</TableCell>
                <TableCell className="font-medium">{row.transactionNo}</TableCell>
                <TableCell>{row.brand.name}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{row.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.account.name}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {row.client?.name ?? row.vendor?.name ?? "-"}
                </TableCell>
                <TableCell>{row.project?.name ?? "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.paymentStatus} />
                </TableCell>
                <TableCell>{formatCurrency(Number(row.amountIn))}</TableCell>
                <TableCell>{formatCurrency(Number(row.amountOut))}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/transactions/${row.id}`}>Detail</Link>
                    </Button>

                    <Button asChild size="sm" variant="outline">
                      <Link href={`/transactions/${row.id}/edit`}>Edit</Link>
                    </Button>

                    <DeleteButton
                      action={deleteTransactionAction}
                      id={row.id}
                      label="Hapus"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageSizeSelect value={currentPageSize} />

        <PaginationControls
          page={currentPage}
          pageSize={
            currentPageSize === "all"
              ? transactions.total || 1
              : currentPageSize
          }
          total={transactions.total}
        />
      </div>
    </>
  );
}