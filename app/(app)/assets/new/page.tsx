import { AssetForm } from "@/components/forms/asset-form";
import { PageHeader } from "@/components/shared/page-header";
import { ASSET_CATEGORY_OPTIONS } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { getMasterDataOptions } from "@/lib/services/master-data";

const conditionOptions = [
  { label: "Excellent", value: "EXCELLENT" },
  { label: "Good", value: "GOOD" },
  { label: "Fair", value: "FAIR" },
  { label: "Needs Repair", value: "NEEDS_REPAIR" },
  { label: "Retired", value: "RETIRED" },
];

export default async function NewAssetPage() {
  const user = await requireUser();
  const master = await getMasterDataOptions(user);

  return (
    <>
      <PageHeader
        eyebrow="Aset"
        title="Tambah aset bisnis"
        description="Data aset langsung dibuat dengan skema penyusutan garis lurus per bulan."
      />

      <AssetForm
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
