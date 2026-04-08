import { BrandBarChart } from "@/components/dashboard/chart-panels";
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
import { toOptions } from "@/lib/options";
import { readFilters } from "@/lib/search-params";
import { getCashFlowReport } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency } from "@/lib/utils";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CashFlowReportPage({
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

  const [master, report] = await Promise.all([
    getMasterDataOptions(user),
    getCashFlowReport(user, filters),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Laporan"
        title="Laporan arus kas"
        description="Melihat inflow, outflow, dan net cash flow berdasarkan periode terpilih."
      />

      <QueryFilters
        brandOptions={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        defaultValues={defaultValues}
      />

      <BrandBarChart
        title="Net cash flow bulanan"
        description="Net arus kas per periode dalam range yang dipilih."
        data={report.rows.map((row) => ({ label: row.label, value: row.net }))}
        color="#355E3B"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Periode</TableHead>
            <TableHead>Inflow</TableHead>
            <TableHead>Outflow</TableHead>
            <TableHead>Net cash</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {report.rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{formatCurrency(row.inflow)}</TableCell>
              <TableCell>{formatCurrency(row.outflow)}</TableCell>
              <TableCell>{formatCurrency(row.net)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}