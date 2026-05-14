import { notFound } from "next/navigation";

import { VendorForm } from "@/components/forms/vendor-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { getMasterDataOptions, getVendorById } from "@/lib/services/master-data";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFinanceWorkspaceUser();
  const { id } = await params;

  const [master, vendor] = await Promise.all([
    getMasterDataOptions(user),
    getVendorById(user, id),
  ]);

  if (!vendor) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title={`Edit vendor ${vendor.name}`}
        description="Perbarui detail vendor dan mapping brand yang memakainya. Brand yang sudah dipakai histori akan tetap terkunci."
      />

      <VendorForm
        id={vendor.id}
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        defaultValues={{
          name: vendor.name,
          phone: vendor.phone ?? "",
          email: vendor.email ?? "",
          address: vendor.address ?? "",
          notes: vendor.notes ?? "",
          brandIds: vendor.brandLinks.map((link) => link.brandId),
        }}
        lockedBrandIds={vendor.lockedBrandIds}
      />
    </>
  );
}
