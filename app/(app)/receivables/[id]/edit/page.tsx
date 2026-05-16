import { notFound } from "next/navigation";

import { InvoiceForm } from "@/components/forms/invoice-form";
import { InvoiceAdditionalItemsPanel } from "@/components/receivables/invoice-additional-items-panel";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { getInvoiceDisplayAmounts } from "@/lib/invoice-additional-items";
import { toDateInputValue, toMetaOptions, toOptions } from "@/lib/options";
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

  const displayAmounts = getInvoiceDisplayAmounts(invoice);

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
        clients={toMetaOptions(master.clients, (item) => item.id, (item) => item.name, (item) => ({
          brandIds: item.brandLinks.map((link) => link.brandId),
        }))}
        projects={toMetaOptions(projects, (item) => item.id, (item) => item.name, (item) => ({
          brandId: item.brandId,
        }))}
        isLinkedToTransactions={invoice.transactions.length > 0}
      >
        <InvoiceAdditionalItemsPanel
          invoiceId={invoice.id}
          baseTotal={displayAmounts.baseTotal}
          additionalTotal={displayAmounts.additionalTotal}
          grandTotal={displayAmounts.grandTotal}
          downPayment={Number(invoice.downPayment)}
          amountPaid={displayAmounts.amountPaid}
          outstandingDisplay={displayAmounts.outstandingDisplay}
          items={invoice.additionalItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalAmount: Number(item.totalAmount),
            notes: item.notes,
            createdAt: item.createdAt.toISOString(),
          }))}
        />
      </InvoiceForm>
    </>
  );
}
