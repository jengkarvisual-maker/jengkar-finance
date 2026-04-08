import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminOrOwner } from "@/lib/auth/guards";
import { listAccounts } from "@/lib/services/master-data";

export default async function MasterAccountsPage() {
  const user = await requireAdminOrOwner();
  const accounts = await listAccounts(user);

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Chart of Accounts"
        description="Akun keuangan yang dipakai untuk transaksi, laporan laba rugi, cash flow, dan aset."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama akun</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Saldo normal</TableHead>
            <TableHead>Scope brand</TableHead>
            <TableHead>Transaksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium">{account.code}</TableCell>
              <TableCell>{account.name}</TableCell>
              <TableCell>{account.category.replace(/_/g, " ")}</TableCell>
              <TableCell>{account.normalBalance}</TableCell>
              <TableCell>{account.brand?.name ?? "Global"}</TableCell>
              <TableCell>{account._count.transactions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
