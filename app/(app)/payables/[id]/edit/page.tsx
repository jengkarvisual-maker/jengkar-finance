import { notFound } from "next/navigation";

import { VendorBillForm } from "@/components/forms/vendor-bill-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { toDateInputValue, toOptions } from "@/lib/options";
import { getVendorBillById, listProjects } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function EditPayablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [master, bill, projects] = await Promise.all([
    getMasterDataOptions(user),
    getVendorBillById(user, id),
    listProjects(user, {}),
  ]);

  if (!bill) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Hutang vendor"
        title={`Edit ${bill.billNo}`}
        description="Perubahan tagihan akan mengubah outstanding payables dan due date tracking."
      />

      <VendorBillForm
        id={bill.id}
        defaultValues={{
          billNo: bill.billNo,
          billDate: toDateInputValue(bill.billDate),
          vendorId: bill.vendorId,
          brandId: bill.brandId,
          projectId: bill.projectId ?? "",
          description: bill.description,
          totalAmount: Number(bill.totalAmount),
          dueDate: toDateInputValue(bill.dueDate),
          notes: bill.notes ?? "",
        }}
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        vendors={toOptions(master.vendors, (item) => item.id, (item) => item.name)}
        projects={toOptions(projects, (item) => item.id, (item) => item.name)}
      />
    </>
  );
}
