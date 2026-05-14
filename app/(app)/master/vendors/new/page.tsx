import { PageHeader } from "@/components/shared/page-header";
import { VendorForm } from "@/components/forms/vendor-form";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function NewVendorPage() {
  const user = await requireFinanceWorkspaceUser();
  const master = await getMasterDataOptions(user);

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Tambah vendor"
        description="Tambahkan vendor baru dan tentukan brand mana saja yang boleh memakainya."
      />

      <VendorForm
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
      />
    </>
  );
}
