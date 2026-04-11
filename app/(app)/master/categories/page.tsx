import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { listTransactionCategories } from "@/lib/services/master-data";

export default async function MasterCategoriesPage() {
  await requireUser();
  const categories = await listTransactionCategories();

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Kategori transaksi"
        description="Kategori operasional untuk memudahkan input admin dan menjaga konsistensi akun."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Kategori akun</TableHead>
            <TableHead>Dipakai</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.code}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.transactionType.replace(/_/g, " ")}</TableCell>
              <TableCell>{item.accountCategory.replace(/_/g, " ")}</TableCell>
              <TableCell>{item._count.transactions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
