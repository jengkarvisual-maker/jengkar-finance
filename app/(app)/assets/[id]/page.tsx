import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAssetAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { getAssetById } from "@/lib/services/finance";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const asset = await getAssetById(user, id);

  if (!asset) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Detail aset"
        title={asset.name}
        description={`${asset.assetCode} - ${asset.brand.name}`}
        action={
          <>
            <Button asChild variant="secondary">
              <Link href={`/assets/${asset.id}/edit`}>Edit aset</Link>
            </Button>
            <DeleteButton action={deleteAssetAction} id={asset.id} redirectTo="/assets" />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Informasi aset</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>Kategori: {asset.category.replace(/_/g, " ")}</p>
            <p>Tanggal beli: {formatDate(asset.purchaseDate)}</p>
            <p>Harga beli: {formatCurrency(Number(asset.purchasePrice))}</p>
            <p>Umur manfaat: {asset.usefulLifeMonths} bulan</p>
            <p>Depresiasi per bulan: {formatCurrency(Number(asset.monthlyDepreciation))}</p>
            <p>Nilai buku: {formatCurrency(Number(asset.bookValue))}</p>
            <p>Kondisi: {asset.condition.replace(/_/g, " ")}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>3 jadwal depresiasi terdekat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {asset.depreciations.slice(0, 3).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 px-4 py-3">
                <p className="font-medium">{formatDate(entry.periodStart)} - {formatDate(entry.periodEnd)}</p>
                <p className="text-muted-foreground">
                  {formatCurrency(Number(entry.amount))} - Nilai buku setelah depresiasi {formatCurrency(Number(entry.bookValueAfter))}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
