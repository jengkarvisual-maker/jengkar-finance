import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { deleteClientAction } from "@/lib/actions/finance";
import { DeleteButton } from "@/components/shared/delete-button";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { listClients } from "@/lib/services/master-data";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default async function MasterClientsPage() {
  const user = await requireFinanceWorkspaceUser();
  const clients = await listClients(user);

  return (
    <>
      <PageHeader
        eyebrow="Master data"
        title="Client"
        description="Daftar klien untuk project, invoice, dan histori transaksi."
        action={
          <Button asChild>
            <Link href="/master/clients/new">Tambah client</Link>
          </Button>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Invoices</TableHead>
            <TableHead>Transaksi</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>{client.companyName ?? "-"}</TableCell>
              <TableCell>{client.phone ?? client.email ?? "-"}</TableCell>
              <TableCell>
                {client.brandLinks.length > 0
                  ? client.brandLinks.map((link) => link.brand.name).join(", ")
                  : "Belum dihubungkan"}
              </TableCell>
              <TableCell>{client._count.projects}</TableCell>
              <TableCell>{client._count.invoices}</TableCell>
              <TableCell>{client._count.transactions}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/master/clients/${client.id}/edit`}>Edit</Link>
                  </Button>
                  {client._count.projects === 0 &&
                  client._count.invoices === 0 &&
                  client._count.transactions === 0 ? (
                    <DeleteButton action={deleteClientAction} id={client.id} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Terhubung data
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
