import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminOrOwner } from "@/lib/auth/guards";
import { listUsers } from "@/lib/services/master-data";

export default async function MasterUsersPage() {
  await requireAdminOrOwner();
  const users = await listUsers();

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="User internal"
        description="Owner, admin, dan finance staff beserta akses brand masing-masing."
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
              <TableCell>{user.role.name}</TableCell>
              <TableCell>
                <StatusBadge status={user.status} />
              </TableCell>
              <TableCell>
                {user.allBrandsAccess
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
