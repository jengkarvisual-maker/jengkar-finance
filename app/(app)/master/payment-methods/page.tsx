import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminOrOwner } from "@/lib/auth/guards";
import { listPaymentMethods } from "@/lib/services/master-data";

export default async function MasterPaymentMethodsPage() {
  await requireAdminOrOwner();
  const paymentMethods = await listPaymentMethods();

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Metode pembayaran"
        description="Cash, transfer bank, QRIS, dan channel pembayaran lain yang dipakai di transaksi harian."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Cash?</TableHead>
            <TableHead>Dipakai di transaksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentMethods.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.code}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.type ?? "-"}</TableCell>
              <TableCell>{item.accountName ?? "-"}</TableCell>
              <TableCell>{item.isCash ? "Ya" : "Tidak"}</TableCell>
              <TableCell>{item._count.transactions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
