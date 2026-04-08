import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { deleteClientAction } from "@/lib/actions/finance";
import { DeleteButton } from "@/components/shared/delete-button";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default async function MasterClientsPage() {
  const clients = await prisma.client.findMany({
    include: {
      _count: {
        select: {
          projects: true,
          invoices: true,
          transactions: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

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
              <TableCell>{client._count.projects}</TableCell>
              <TableCell>{client._count.invoices}</TableCell>
              <TableCell>{client._count.transactions}</TableCell>
              <TableCell>
                {client._count.projects === 0 &&
                client._count.invoices === 0 &&
                client._count.transactions === 0 ? (
                  <DeleteButton action={deleteClientAction} id={client.id} />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Terhubung data
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}