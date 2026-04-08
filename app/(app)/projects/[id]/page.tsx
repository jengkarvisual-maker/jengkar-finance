import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteProjectAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { getProjectById } from "@/lib/services/finance";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectById(user, id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Detail project"
        title={project.name}
        description={`${project.projectCode} - ${project.brand.name}`}
        action={
          <>
            <Button asChild variant="secondary">
              <Link href={`/projects/${project.id}/edit`}>Edit project</Link>
            </Button>
            <DeleteButton action={deleteProjectAction} id={project.id} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Ringkasan performa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>Klien: {project.client.name}</p>
            <p>Tanggal project: {formatDate(project.projectDate)}</p>
            <p>Status: {project.status}</p>
            <p>Nilai project: {formatCurrency(Number(project.value))}</p>
            <p>Pendapatan project: {formatCurrency(Number(project.recognizedIncome))}</p>
            <p>Biaya project: {formatCurrency(Number(project.recognizedCost))}</p>
            <p>Profit project: {formatCurrency(Number(project.profit))}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <CardTitle>Relasi bisnis</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>Jumlah invoice: {project.invoices.length}</p>
            <p>Jumlah tagihan vendor: {project.vendorBills.length}</p>
            <p>Jumlah transaksi: {project.transactions.length}</p>
            <p>Catatan: {project.notes ?? "-"}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
