import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { listVendors } from "@/lib/services/master-data";

export default async function MasterVendorsPage() {
  const user = await requireFinanceWorkspaceUser();
  const vendors = await listVendors(user);

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Vendor"
        description="Vendor operasional untuk biaya produksi, tagihan, dan pembayaran project."
        action={
          <Button asChild>
            <Link href="/master/vendors/new">Tambah vendor</Link>
          </Button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Tagihan</TableHead>
            <TableHead>Transaksi</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id}>
              <TableCell className="font-medium">{vendor.name}</TableCell>
              <TableCell>{vendor.phone ?? vendor.email ?? "-"}</TableCell>
              <TableCell>
                {vendor.brandLinks.length > 0
                  ? vendor.brandLinks.map((link) => link.brand.name).join(", ")
                  : "Belum dihubungkan"}
              </TableCell>
              <TableCell>{vendor._count.vendorBills}</TableCell>
              <TableCell>{vendor._count.transactions}</TableCell>
              <TableCell>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/master/vendors/${vendor.id}/edit`}>Edit</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
