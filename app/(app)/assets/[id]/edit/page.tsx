import { notFound } from "next/navigation";

import { AssetForm } from "@/components/forms/asset-form";
import { PageHeader } from "@/components/shared/page-header";
import { ASSET_CATEGORY_OPTIONS } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { toDateInputValue, toOptions } from "@/lib/options";
import { getAssetById } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

const conditionOptions = [
  { label: "Excellent", value: "EXCELLENT" },
  { label: "Good", value: "GOOD" },
  { label: "Fair", value: "FAIR" },
  { label: "Needs Repair", value: "NEEDS_REPAIR" },
  { label: "Retired", value: "RETIRED" },
];

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [master, asset] = await Promise.all([getMasterDataOptions(user), getAssetById(user, id)]);

  if (!asset) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Aset"
        title={`Edit ${asset.assetCode}`}
        description="Perubahan harga beli atau umur manfaat akan membentuk ulang jadwal depresiasi."
      />

      <AssetForm
        id={asset.id}
        defaultValues={{
          assetCode: asset.assetCode,
          name: asset.name,
          brandId: asset.brandId,
          category: asset.category,
          purchaseDate: toDateInputValue(asset.purchaseDate),
          purchasePrice: Number(asset.purchasePrice),
          usefulLifeMonths: asset.usefulLifeMonths,
          condition: asset.condition,
          notes: asset.notes ?? "",
        }}
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        categories={ASSET_CATEGORY_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        conditions={conditionOptions}
      />
    </>
  );
}
