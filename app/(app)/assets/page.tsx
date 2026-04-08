import Link from "next/link";

import { deleteAssetAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { readFilters } from "@/lib/search-params";
import { listAssets } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { QueryFilters } from "@/components/shared/query-filters";
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

export default async function AssetsPage({
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
  };

  const [master, assets] = await Promise.all([
    getMasterDataOptions(user),
    listAssets(user, filters),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Aset bisnis"
        title="Data aset dan penyusutan"
        description="Pantau kamera, lighting, komputer, wardrobe, properti studio, dan aset operasional lain beserta nilai bukunya."
        action={
          <Button asChild>
            <Link href="/assets/new">Tambah aset</Link>
          </Button>
        }
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
            <TableHead>Kategori</TableHead>
            <TableHead>Tanggal beli</TableHead>
            <TableHead>Harga beli</TableHead>
            <TableHead>Depresiasi / bulan</TableHead>
            <TableHead>Nilai buku</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {assets.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.assetCode}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.brand.name}</TableCell>
              <TableCell>{row.category.replace(/_/g, " ")}</TableCell>
              <TableCell>{formatDate(row.purchaseDate)}</TableCell>
              <TableCell>{formatCurrency(Number(row.purchasePrice))}</TableCell>
              <TableCell>{formatCurrency(Number(row.monthlyDepreciation))}</TableCell>
              <TableCell>{formatCurrency(Number(row.bookValue))}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/assets/${row.id}`}>Detail</Link>
                  </Button>

                  <Button asChild size="sm" variant="outline">
                    <Link href={`/assets/${row.id}/edit`}>Edit</Link>
                  </Button>

                  <DeleteButton action={deleteAssetAction} id={row.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}