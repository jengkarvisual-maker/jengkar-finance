import { VendorBillForm } from "@/components/forms/vendor-bill-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { listProjects } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function NewPayablePage() {
  const user = await requireUser();
  const [master, projects] = await Promise.all([getMasterDataOptions(user), listProjects(user, {})]);

  return (
    <>
      <PageHeader
        eyebrow="Hutang vendor"
        title="Tambah tagihan vendor"
        description="Catat hutang vendor per brand atau project untuk memudahkan monitoring cash out dan due date."
      />

      <VendorBillForm
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        vendors={toOptions(master.vendors, (item) => item.id, (item) => item.name)}
        projects={toOptions(projects, (item) => item.id, (item) => item.name)}
      />
    </>
  );
}
