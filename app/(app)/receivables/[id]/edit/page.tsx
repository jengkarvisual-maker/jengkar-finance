import { notFound } from "next/navigation";

import { InvoiceForm } from "@/components/forms/invoice-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { toDateInputValue, toOptions } from "@/lib/options";
import { getInvoiceById, listProjects } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function EditReceivablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [master, invoice, projects] = await Promise.all([
    getMasterDataOptions(user),
    getInvoiceById(user, id),
    listProjects(user, {}),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Piutang"
        title={`Edit ${invoice.invoiceNo}`}
        description="Perubahan invoice akan langsung mempengaruhi outstanding receivables dan dashboard."
      />
      <InvoiceForm
        id={invoice.id}
        defaultValues={{
          invoiceNo: invoice.invoiceNo,
          invoiceDate: toDateInputValue(invoice.invoiceDate),
          brandId: invoice.brandId,
          clientId: invoice.clientId,
          projectId: invoice.projectId ?? "",
          totalAmount: Number(invoice.totalAmount),
          downPayment: Number(invoice.downPayment),
          dueDate: toDateInputValue(invoice.dueDate),
          notes: invoice.notes ?? "",
        }}
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        clients={toOptions(master.clients, (item) => item.id, (item) => item.name)}
        projects={toOptions(projects, (item) => item.id, (item) => item.name)}
      />
    </>
  );
}
