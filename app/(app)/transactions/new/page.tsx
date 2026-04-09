import { TransactionForm } from "@/components/forms/transaction-form";
import { PageHeader } from "@/components/shared/page-header";
import { PAYMENT_STATUS_OPTIONS, TRANSACTION_TYPE_OPTIONS } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { listInvoices, listProjects, listVendorBills } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function NewTransactionPage() {
  const user = await requireUser();
  const [master, invoices, vendorBills, projects] = await Promise.all([
    getMasterDataOptions(user),
    listInvoices(user, { take: 50 }),
    listVendorBills(user, {}),
    listProjects(user, {}),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Transaksi"
        title="Tambah transaksi baru"
        description="Gunakan form ini untuk mencatat pemasukan, pengeluaran, DP, pelunasan, dan transaksi operasional lain."
      />

      <TransactionForm
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
