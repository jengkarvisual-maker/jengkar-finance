import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteVendorBillAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { getVendorBillById } from "@/lib/services/finance";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PayableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const bill = await getVendorBillById(user, id);

  if (!bill) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Detail hutang vendor"
        title={bill.billNo}
        description={`${bill.vendor.name} - ${bill.brand.name}`}
        action={
          <>
            <Button asChild variant="secondary">
              <Link href={`/payables/${bill.id}/edit`}>Edit tagihan</Link>
            </Button>
            <DeleteButton action={deleteVendorBillAction} id={bill.id} redirectTo="/payables" />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Ringkasan hutang</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>Tanggal tagihan: {formatDate(bill.billDate)}</p>
            <p>Jatuh tempo: {formatDate(bill.dueDate)}</p>
            <p>Total tagihan: {formatCurrency(Number(bill.totalAmount))}</p>
            <p>Sudah dibayar: {formatCurrency(Number(bill.amountPaid))}</p>
            <p>Sisa hutang: {formatCurrency(Number(bill.outstandingAmount))}</p>
            <p>Status: {bill.status}</p>
            <p>Project: {bill.project?.name ?? "-"}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Riwayat pembayaran terkait</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {bill.transactions.length === 0 ? (
              <p className="text-muted-foreground">Belum ada transaksi yang ditautkan ke tagihan ini.</p>
            ) : (
              bill.transactions.map((tx) => (
                <div key={tx.id} className="rounded-2xl border border-border/70 px-4 py-3">
                  <p className="font-medium">{tx.transactionNo}</p>
                  <p className="text-muted-foreground">
                    {formatDate(tx.transactionDate)} - {formatCurrency(Number(tx.amountOut))}
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
