import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceAdditionalItemsPanel } from "@/components/receivables/invoice-additional-items-panel";
import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteInvoiceAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { getInvoiceDisplayAmounts } from "@/lib/invoice-additional-items";
import { getInvoiceById } from "@/lib/services/finance";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ReceivableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await getInvoiceById(user, id);

  if (!invoice) {
    notFound();
  }

  const displayAmounts = getInvoiceDisplayAmounts(invoice);

  return (
    <>
      <PageHeader
        eyebrow="Detail invoice"
        title={invoice.invoiceNo}
        description={`${invoice.client.name} - ${invoice.project?.name ?? invoice.brand.name}`}
        action={
  <>
    <Button asChild>
      <a href={`/api/invoices/${invoice.id}/pdf`}>Download PDF</a>
    </Button>

    <Button asChild variant="secondary">
      <Link href={`/receivables/${invoice.id}/edit`}>
        Edit invoice
      </Link>
    </Button>    

    <Button asChild variant="secondary">
      <Link href={`/receivables/${invoice.id}/print`} target="_blank" rel="noreferrer">
        Print preview
      </Link>
    </Button>

    
    <DeleteButton action={deleteInvoiceAction} id={invoice.id} redirectTo="/receivables" />
  </>
}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Ringkasan piutang</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>Brand: {invoice.brand.name}</p>
            <p>Tanggal invoice: {formatDate(invoice.invoiceDate)}</p>
            <p>Jatuh tempo: {formatDate(invoice.dueDate)}</p>
            <p>Total invoice awal: {formatCurrency(displayAmounts.baseTotal)}</p>
            <p>Total tambahan: {formatCurrency(displayAmounts.additionalTotal)}</p>
            <p>Grand total: {formatCurrency(displayAmounts.grandTotal)}</p>
            <p>DP diterima: {formatCurrency(Number(invoice.downPayment))}</p>
            <p>Sudah dibayar: {formatCurrency(displayAmounts.amountPaid)}</p>
            <p>Sisa pembayaran tampilan: {formatCurrency(displayAmounts.outstandingDisplay)}</p>
            <p>Status: {invoice.status}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Riwayat pembayaran terkait</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {invoice.transactions.length === 0 ? (
              <p className="text-muted-foreground">Belum ada transaksi yang ditautkan ke invoice ini.</p>
            ) : (
              invoice.transactions.map((tx) => (
                <div key={tx.id} className="rounded-2xl border border-border/70 px-4 py-3">
                  <p className="font-medium">{tx.transactionNo}</p>
                  <p className="text-muted-foreground">
                    {formatDate(tx.transactionDate)} - {formatCurrency(Number(tx.amountIn))}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
    </>
  );
}
