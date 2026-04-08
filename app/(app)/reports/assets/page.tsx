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
import { getAssetSummaryReport } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency, formatDate } from "@/lib/utils";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssetReportPage({
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
    getAssetSummaryReport(user, filters),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Laporan"
        title="Ringkasan aset"
        description="Aset per brand beserta harga beli, akumulasi penyusutan, dan nilai buku."
      />

      <QueryFilters
        brandOptions={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        defaultValues={defaultValues}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama aset</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Tanggal beli</TableHead>
            <TableHead>Harga beli</TableHead>
            <TableHead>Akumulasi depresiasi</TableHead>
            <TableHead>Nilai buku</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {report.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.assetCode}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.brand.name}</TableCell>
              <TableCell>{formatDate(row.purchaseDate)}</TableCell>
              <TableCell>{formatCurrency(Number(row.purchasePrice))}</TableCell>
              <TableCell>{formatCurrency(Number(row.accumulatedDepreciation))}</TableCell>
              <TableCell>{formatCurrency(Number(row.bookValue))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}