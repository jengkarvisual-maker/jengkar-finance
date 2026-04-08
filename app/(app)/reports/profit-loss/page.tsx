import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { QueryFilters } from "@/components/shared/query-filters";
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
import { requireUser } from "@/lib/auth/session";
import { ACCOUNT_CATEGORY_OPTIONS } from "@/lib/constants";
import { toOptions } from "@/lib/options";
import { readFilters } from "@/lib/search-params";
import { getProfitLossReport } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ProfitLossReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const filters = readFilters(resolvedSearchParams);

  const [master, report] = await Promise.all([
    getMasterDataOptions(user),
    getProfitLossReport(user, filters),
  ]);

  const defaultValues: Record<string, string | undefined> = {
    brandId: getSingleValue(resolvedSearchParams.brandId),
    category: getSingleValue(resolvedSearchParams.category),
    page: getSingleValue(resolvedSearchParams.page),
    pageSize: getSingleValue(resolvedSearchParams.pageSize),
  };

  return (
    <>
      <PageHeader
        eyebrow="Laporan"
        title="Laporan laba rugi"
        description="Analisis revenue, COGS, operating expense, dan net profit per brand maupun konsolidasi."
        action={
          <Button asChild variant="secondary">
            <Link href="/api/export/profit-loss">Export CSV</Link>
          </Button>
        }
      />

      <QueryFilters
        brandOptions={toOptions(
          master.brands,
          (item) => item.id,
          (item) => item.name
        )}
        categoryOptions={ACCOUNT_CATEGORY_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        defaultValues={defaultValues}
      />

      <Card className="border-border/70 bg-white/80">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(report.summary.revenue)}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">COGS</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(report.summary.cogs)}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Operating expense</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(report.summary.expense)}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Net profit</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(report.summary.netProfit)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Brand</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead>COGS</TableHead>
            <TableHead>Gross profit</TableHead>
            <TableHead>Expense</TableHead>
            <TableHead>Other income</TableHead>
            <TableHead>Other expense</TableHead>
            <TableHead>Net profit</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {report.rows.map((row) => (
            <TableRow key={row.brandId}>
              <TableCell className="font-medium">{row.brandName}</TableCell>
              <TableCell>{formatCurrency(row.revenue)}</TableCell>
              <TableCell>{formatCurrency(row.cogs)}</TableCell>
              <TableCell>{formatCurrency(row.grossProfit)}</TableCell>
              <TableCell>{formatCurrency(row.expense)}</TableCell>
              <TableCell>{formatCurrency(row.otherIncome)}</TableCell>
              <TableCell>{formatCurrency(row.otherExpense)}</TableCell>
              <TableCell>{formatCurrency(row.netProfit)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}