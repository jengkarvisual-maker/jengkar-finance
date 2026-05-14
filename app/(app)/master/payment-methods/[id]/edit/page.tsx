import { notFound } from "next/navigation";

import { PaymentMethodForm } from "@/components/forms/payment-method-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { getMasterDataOptions, getPaymentMethodById } from "@/lib/services/master-data";

export default async function EditPaymentMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFinanceWorkspaceUser();
  const { id } = await params;

  const [master, paymentMethod] = await Promise.all([
    getMasterDataOptions(user),
    getPaymentMethodById(user, id),
  ]);

  if (!paymentMethod) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title={`Edit metode pembayaran ${paymentMethod.name}`}
        description="Perbarui detail channel pembayaran dan mapping brand yang boleh memakainya."
      />

      <PaymentMethodForm
        id={paymentMethod.id}
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        defaultValues={{
          code: paymentMethod.code,
          name: paymentMethod.name,
          type: paymentMethod.type ?? "",
          accountName: paymentMethod.accountName ?? "",
          accountNo: paymentMethod.accountNo ?? "",
          notes: paymentMethod.notes ?? "",
          isCash: paymentMethod.isCash,
          brandIds: paymentMethod.brandLinks.map((link) => link.brandId),
        }}
        lockedBrandIds={paymentMethod.lockedBrandIds}
      />
    </>
  );
}
