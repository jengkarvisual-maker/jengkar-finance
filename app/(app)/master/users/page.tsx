import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { getFinanceUserRoleLabel, hasAllBrandAccess } from "@/lib/permissions";
import { listUsers } from "@/lib/services/master-data";

export default async function MasterUsersPage() {
  await requireUser();
  const users = await listUsers();

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="User internal"
        description="Daftar akun internal yang dipakai khusus untuk mengakses aplikasi Finance."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scope brand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{getFinanceUserRoleLabel(user)}</TableCell>
              <TableCell>
                <StatusBadge status={user.status} />
              </TableCell>
              <TableCell>
                {hasAllBrandAccess(user)
                  ? "Semua brand"
                  : user.brandAccesses.map((access) => access.brand.name).join(", ")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
