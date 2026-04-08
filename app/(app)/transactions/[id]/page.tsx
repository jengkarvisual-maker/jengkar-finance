import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteTransactionAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { getTransactionById } from "@/lib/services/finance";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const transaction = await getTransactionById(user, id);

  if (!transaction) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Detail transaksi"
        title={transaction.transactionNo}
        description={transaction.description}
        action={
          <>
            <Button asChild variant="secondary">
              <Link href={`/transactions/${transaction.id}/edit`}>Edit transaksi</Link>
            </Button>
            <DeleteButton action={deleteTransactionAction} id={transaction.id} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Informasi utama</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>Tanggal: {formatDate(transaction.transactionDate)}</p>
            <p>Brand: {transaction.brand.name}</p>
            <p>Jenis: {transaction.transactionType.replace(/_/g, " ")}</p>
            <p>Kategori: {transaction.category.name}</p>
            <p>Akun: {transaction.account.name}</p>
            <p>Metode pembayaran: {transaction.paymentMethod?.name ?? "-"}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Nominal dan relasi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>Nominal masuk: {formatCurrency(Number(transaction.amountIn))}</p>
            <p>Nominal keluar: {formatCurrency(Number(transaction.amountOut))}</p>
            <p>Klien: {transaction.client?.name ?? "-"}</p>
            <p>Vendor: {transaction.vendor?.name ?? "-"}</p>
            <p>Project: {transaction.project?.name ?? "-"}</p>
            <p>Invoice: {transaction.invoice?.invoiceNo ?? "-"}</p>
            <p>Tagihan vendor: {transaction.vendorBill?.billNo ?? "-"}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
