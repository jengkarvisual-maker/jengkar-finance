import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { listPaymentMethods } from "@/lib/services/master-data";

export default async function MasterPaymentMethodsPage() {
  const user = await requireFinanceWorkspaceUser();
  const paymentMethods = await listPaymentMethods(user);

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Metode pembayaran"
        description="Cash, transfer bank, QRIS, dan channel pembayaran lain yang dipakai di transaksi harian."
        action={
          <Button asChild>
            <Link href="/master/payment-methods/new">Tambah metode pembayaran</Link>
          </Button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Cash?</TableHead>
            <TableHead>Dipakai di transaksi</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentMethods.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.code}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.type ?? "-"}</TableCell>
              <TableCell>{item.accountName ?? "-"}</TableCell>
              <TableCell>
                {item.brandLinks.length > 0
                  ? item.brandLinks.map((link) => link.brand.name).join(", ")
                  : "Belum dihubungkan"}
              </TableCell>
              <TableCell>{item.isCash ? "Ya" : "Tidak"}</TableCell>
              <TableCell>{item._count.transactions}</TableCell>
              <TableCell>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/master/payment-methods/${item.id}/edit`}>Edit</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
