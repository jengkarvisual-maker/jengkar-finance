import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintToolbar } from "@/components/shared/print-toolbar";
import { getCurrentSession, requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { buildInvoicePdfFilename, getBrandLogoDataUri } from "@/lib/invoice-documents";
import { getInvoiceById } from "@/lib/services/finance";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await getCurrentSession();

  if (!user) {
    return { title: "Invoice print" };
  }

  const { id } = await params;
  const invoice = await getInvoiceById(user, id);

  if (!invoice) {
    return { title: "Invoice print" };
  }

  return {
    title: {
      absolute: buildInvoicePdfFilename(invoice).replace(/\.pdf$/i, ""),
    },
  };
}

export default async function ReceivablePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFinanceWorkspaceUser();
  const { id } = await params;
  const invoice = await getInvoiceById(user, id);

  if (!invoice) {
    notFound();
  }

  const brandLogoDataUri = await getBrandLogoDataUri(invoice.brand);

  return (
    <main className="min-h-screen bg-stone-100 print:bg-white">
      <PrintToolbar
        backHref={`/receivables/${invoice.id}`}
        downloadHref={`/api/invoices/${invoice.id}/pdf`}
      />

      <div className="mx-auto max-w-5xl px-4 py-6 print:px-0 print:py-0">
        <section className="overflow-hidden rounded-[28px] border border-border/70 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b border-border/70 px-6 py-6 print:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="metric-chip">Invoice</div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {invoice.invoiceNo}
                  </h1>
                  <p className="text-sm text-muted-foreground">{invoice.brand.name}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground sm:text-right">
                <div className="flex justify-start sm:justify-end">
                  {brandLogoDataUri ? (
                    <img
                      src={brandLogoDataUri}
                      alt={invoice.brand.name}
                      className="max-h-14 w-auto max-w-[180px] object-contain"
                    />
                  ) : (
                    <div className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground">
                      {invoice.brand.name}
                    </div>
                  )}
                </div>
                <p>Tanggal invoice: {formatDate(invoice.invoiceDate)}</p>
                <p>Jatuh tempo: {formatDate(invoice.dueDate)}</p>
                <p>Status: {invoice.status}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 md:grid-cols-2 print:px-8">
            <div className="rounded-3xl border border-border/70 bg-stone-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Ditagihkan kepada
              </p>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-base font-semibold text-foreground">
                  {invoice.client.name}
                </p>
                {invoice.client.companyName ? <p>{invoice.client.companyName}</p> : null}
                {invoice.client.phone ? <p>{invoice.client.phone}</p> : null}
                {invoice.client.email ? <p>{invoice.client.email}</p> : null}
                {invoice.client.address ? <p>{invoice.client.address}</p> : null}
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-stone-50 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Project
              </p>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-base font-semibold text-foreground">
                  {invoice.project?.name ?? invoice.brand.name}
                </p>
                {invoice.notes ? <p>{invoice.notes}</p> : null}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 print:px-8">
            <div className="overflow-hidden rounded-3xl border border-border/70">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-100 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Deskripsi</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">DP</th>
                    <th className="px-4 py-3 font-medium text-right">Sudah dibayar</th>
                    <th className="px-4 py-3 font-medium text-right">Sisa</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/70">
                    <td className="px-4 py-3">
                      {invoice.project?.name ?? `Invoice ${invoice.invoiceNo}`}
                    </td>
                    <td className="px-4 py-3">{invoice.status}</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(Number(invoice.downPayment))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(Number(invoice.amountPaid))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(Number(invoice.outstandingAmount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(Number(invoice.totalAmount))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-6 pb-6 print:px-8">
            <div className="rounded-3xl border border-border/70">
              <div className="border-b border-border/70 px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Riwayat pembayaran
                </h2>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="bg-stone-100 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">No. Transaksi</th>
                    <th className="px-4 py-3 font-medium">Deskripsi</th>
                    <th className="px-4 py-3 font-medium text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.transactions.length > 0 ? (
                    invoice.transactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-border/70">
                        <td className="px-4 py-3">{formatDate(tx.transactionDate)}</td>
                        <td className="px-4 py-3">{tx.transactionNo}</td>
                        <td className="px-4 py-3">{tx.description}</td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(Number(tx.amountIn))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-border/70">
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        Belum ada pembayaran untuk invoice ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-border/70 bg-stone-50 px-6 py-6 print:px-8">
            <div className="ml-auto flex max-w-sm flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total invoice</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(Number(invoice.totalAmount))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sudah dibayar</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(Number(invoice.amountPaid))}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/70 pt-3 text-base font-semibold text-foreground">
                <span>Sisa tagihan</span>
                <span>{formatCurrency(Number(invoice.outstandingAmount))}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
