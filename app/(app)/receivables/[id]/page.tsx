import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteInvoiceAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
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

  return (
    <>
      <PageHeader
        eyebrow="Detail invoice"
        title={invoice.invoiceNo}
        description={`${invoice.client.name} - ${invoice.project?.name ?? invoice.brand.name}`}
        action={
  <>

    <Button asChild variant="secondary">
      <Link href={`/receivables/${invoice.id}/edit`}>
        Edit invoice
      </Link>
    </Button>    

    <Button asChild variant="secondary">
      <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
        Export PDF
      </a>
    </Button>

    
    <DeleteButton action={deleteInvoiceAction} id={invoice.id} />
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
            <p>Total invoice: {formatCurrency(Number(invoice.totalAmount))}</p>
            <p>DP diterima: {formatCurrency(Number(invoice.downPayment))}</p>
            <p>Sudah dibayar: {formatCurrency(Number(invoice.amountPaid))}</p>
            <p>Sisa tagihan: {formatCurrency(Number(invoice.outstandingAmount))}</p>
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
    </>
  );
}
