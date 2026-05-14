import { TransactionForm } from "@/components/forms/transaction-form";
import { PageHeader } from "@/components/shared/page-header";
import { PAYMENT_STATUS_OPTIONS, TRANSACTION_TYPE_OPTIONS } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { toMetaOptions, toOptions } from "@/lib/options";
import { listInvoices, listProjects, listVendorBills } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

function toInvoiceOptions(
  rows: Awaited<ReturnType<typeof listInvoices>>["rows"],
) {
  return rows.map((item) => ({
    value: item.id,
    label: [item.invoiceNo, item.client.name, item.brand.name, item.project?.name]
      .filter(Boolean)
      .join(" | "),
    referenceNo: item.invoiceNo ?? "",
    brandId: item.brandId,
  }));
}

export default async function NewTransactionPage() {
  const user = await requireUser();
  const [master, invoices, vendorBills, projects] = await Promise.all([
    getMasterDataOptions(user),
    listInvoices(user, {}),
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
        clients={toMetaOptions(master.clients, (item) => item.id, (item) => item.name, (item) => ({
          brandIds: item.brandLinks.map((link) => link.brandId),
        }))}
        vendors={toMetaOptions(master.vendors, (item) => item.id, (item) => item.name, (item) => ({
          brandIds: item.brandLinks.map((link) => link.brandId),
        }))}
        projects={toMetaOptions(projects, (item) => item.id, (item) => item.name, (item) => ({
          brandId: item.brandId,
        }))}
        paymentMethods={toMetaOptions(master.paymentMethods, (item) => item.id, (item) => item.name, (item) => ({
          brandIds: item.brandLinks.map((link) => link.brandId),
        }))}
        invoices={toInvoiceOptions(invoices.rows)}
        vendorBills={toMetaOptions(vendorBills.rows, (item) => item.id, (item) => item.billNo, (item) => ({
          brandId: item.brandId,
        }))}
      />
    </>
  );
}
