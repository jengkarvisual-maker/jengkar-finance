import { notFound } from "next/navigation";

import { ClientForm } from "@/components/forms/client-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { getClientById, getMasterDataOptions } from "@/lib/services/master-data";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFinanceWorkspaceUser();
  const { id } = await params;

  const [master, client] = await Promise.all([
    getMasterDataOptions(user),
    getClientById(user, id),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title={`Edit client ${client.name}`}
        description="Perbarui detail client dan mapping brand yang memakainya. Brand yang sudah dipakai histori akan tetap terkunci."
      />

      <ClientForm
        id={client.id}
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        defaultValues={{
          name: client.name,
          companyName: client.companyName ?? "",
          phone: client.phone ?? "",
          email: client.email ?? "",
          address: client.address ?? "",
          notes: client.notes ?? "",
          brandIds: client.brandLinks.map((link) => link.brandId),
        }}
        lockedBrandIds={client.lockedBrandIds}
      />
    </>
  );
}
