import { InvoiceForm } from "@/components/forms/invoice-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { listProjects } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function NewReceivablePage() {
  const user = await requireUser();
  const [master, projects] = await Promise.all([getMasterDataOptions(user), listProjects(user, {})]);

  return (
    <>
      <PageHeader
        eyebrow="Piutang"
        title="Tambah invoice baru"
        description="Buat invoice berbasis project, tentukan DP, jatuh tempo, dan biarkan sistem menghitung outstanding secara otomatis."
      />
      <InvoiceForm
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        clients={toOptions(master.clients, (item) => item.id, (item) => item.name)}
        projects={toOptions(projects, (item) => item.id, (item) => item.name)}
      />
    </>
  );
}
