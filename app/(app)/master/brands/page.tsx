import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminOrOwner } from "@/lib/auth/guards";
import { listBrands } from "@/lib/services/master-data";

export default async function MasterBrandsPage() {
  const user = await requireAdminOrOwner();
  const brands = await listBrands(user);

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Brand Rumah Jengkar"
        description="Struktur brand operasional yang menjadi dasar seluruh transaksi, laporan, dan dashboard konsolidasi."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Transaksi</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Assets</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.map((brand) => (
            <TableRow key={brand.id}>
              <TableCell className="font-medium">{brand.code}</TableCell>
              <TableCell>{brand.name}</TableCell>
              <TableCell>{brand.slug}</TableCell>
              <TableCell>
                <StatusBadge status={brand.status} />
              </TableCell>
              <TableCell>{brand._count.transactions}</TableCell>
              <TableCell>{brand._count.projects}</TableCell>
              <TableCell>{brand._count.assets}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
