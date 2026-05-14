import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/forms/client-form";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function NewClientPage() {
  const user = await requireFinanceWorkspaceUser();
  const master = await getMasterDataOptions(user);

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Tambah client"
        description="Tambahkan client baru untuk project, invoice, dan histori transaksi."
      />

      <ClientForm
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
      />
    </>
  );
}
