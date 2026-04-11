import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/forms/client-form";
import { requireUser } from "@/lib/auth/session";

export default async function NewClientPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Tambah client"
        description="Tambahkan client baru untuk project, invoice, dan histori transaksi."
      />

      <ClientForm />
    </>
  );
}
