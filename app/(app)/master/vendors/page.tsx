import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminOrOwner } from "@/lib/auth/guards";
import { listVendors } from "@/lib/services/master-data";

export default async function MasterVendorsPage() {
  await requireAdminOrOwner();
  const vendors = await listVendors();

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Vendor"
        description="Vendor operasional untuk biaya produksi, tagihan, dan pembayaran project."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Tagihan</TableHead>
            <TableHead>Transaksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id}>
              <TableCell className="font-medium">{vendor.name}</TableCell>
              <TableCell>{vendor.phone ?? vendor.email ?? "-"}</TableCell>
              <TableCell>{vendor._count.vendorBills}</TableCell>
              <TableCell>{vendor._count.transactions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
