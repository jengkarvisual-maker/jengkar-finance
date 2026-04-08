import { notFound } from "next/navigation";

import { TransactionForm } from "@/components/forms/transaction-form";
import { PageHeader } from "@/components/shared/page-header";
import { PAYMENT_STATUS_OPTIONS, TRANSACTION_TYPE_OPTIONS } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { toDateInputValue, toOptions } from "@/lib/options";
import { getTransactionById, listInvoices, listVendorBills, listProjects } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [master, transaction, invoices, vendorBills, projects] = await Promise.all([
    getMasterDataOptions(user),
    getTransactionById(user, id),
    listInvoices(user, {}),
    listVendorBills(user, {}),
    listProjects(user, {}),
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Transaksi"
        title={`Edit ${transaction.transactionNo}`}
        description="Perbarui detail transaksi lalu simpan untuk mengubah agregasi dashboard, laporan, dan relasi piutang / hutang."
      />

      <TransactionForm
        id={transaction.id}
        defaultValues={{
          transactionDate: toDateInputValue(transaction.transactionDate),
          brandId: transaction.brandId,
          transactionType: transaction.transactionType,
          categoryId: transaction.categoryId,
          accountId: transaction.accountId,
          description: transaction.description,
          clientId: transaction.clientId ?? "",
          vendorId: transaction.vendorId ?? "",
          projectId: transaction.projectId ?? "",
          paymentMethodId: transaction.paymentMethodId ?? "",
          paymentStatus: transaction.paymentStatus,
          amountIn: Number(transaction.amountIn),
          amountOut: Number(transaction.amountOut),
          referenceNo: transaction.referenceNo ?? "",
          invoiceId: transaction.invoiceId ?? "",
          vendorBillId: transaction.vendorBillId ?? "",
          notes: transaction.notes ?? "",
        }}
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        transactionTypes={TRANSACTION_TYPE_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        paymentStatuses={PAYMENT_STATUS_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        categories={toOptions(master.categories, (item) => item.id, (item) => `${item.name} - ${item.transactionType}`)}
        accounts={toOptions(master.accounts, (item) => item.id, (item) => `${item.code} - ${item.name}`)}
        clients={toOptions(master.clients, (item) => item.id, (item) => item.name)}
        vendors={toOptions(master.vendors, (item) => item.id, (item) => item.name)}
        projects={toOptions(projects, (item) => item.id, (item) => item.name)}
        paymentMethods={toOptions(master.paymentMethods, (item) => item.id, (item) => item.name)}
        invoices={toOptions(invoices.rows, (item) => item.id, (item) => item.invoiceNo)}
        vendorBills={toOptions(vendorBills.rows, (item) => item.id, (item) => item.billNo)}
      />
    </>
  );
}
