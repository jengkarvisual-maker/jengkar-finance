import { PaymentMethodForm } from "@/components/forms/payment-method-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function NewPaymentMethodPage() {
  const user = await requireFinanceWorkspaceUser();
  const master = await getMasterDataOptions(user);

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Tambah metode pembayaran"
        description="Atur channel pembayaran baru dan pilih brand yang boleh memakainya di transaksi."
      />

      <PaymentMethodForm
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
      />
    </>
  );
}
