import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/forms/client-form";

export default function NewClientPage() {
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