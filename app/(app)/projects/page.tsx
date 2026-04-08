import Link from "next/link";

import { deleteProjectAction } from "@/lib/actions/finance";
import { requireUser } from "@/lib/auth/session";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { toOptions } from "@/lib/options";
import { readFilters } from "@/lib/search-params";
import { listProjects } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DeleteButton } from "@/components/shared/delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { QueryFilters } from "@/components/shared/query-filters";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const rawSearchParams = await searchParams;
  const filters = readFilters(rawSearchParams);

  const defaultValues: Record<string, string | undefined> = {
    brandId: getSingleValue(rawSearchParams.brandId),
    projectId: getSingleValue(rawSearchParams.projectId),
    accountCategory: getSingleValue(rawSearchParams.accountCategory),
    from: getSingleValue(rawSearchParams.from),
    to: getSingleValue(rawSearchParams.to),
    month: getSingleValue(rawSearchParams.month),
    pageSize: getSingleValue(rawSearchParams.pageSize),
    status: getSingleValue(rawSearchParams.status),
  };

  const [master, projects] = await Promise.all([
    getMasterDataOptions(user),
    listProjects(user, filters),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Project / event tracking"
        title="Performa project per brand"
        description="Pantau nilai project, pendapatan yang sudah recognized, biaya yang sudah keluar, dan profit per event."
        action={
          <Button asChild>
            <Link href="/projects/new">Tambah project</Link>
          </Button>
        }
      />

      <QueryFilters
        brandOptions={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        statusOptions={PROJECT_STATUS_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        defaultValues={defaultValues}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Klien</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Nilai</TableHead>
            <TableHead>Pendapatan</TableHead>
            <TableHead>Biaya</TableHead>
            <TableHead>Profit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {projects.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.projectCode}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.brand.name}</TableCell>
              <TableCell>{row.client.name}</TableCell>
              <TableCell>{formatDate(row.projectDate)}</TableCell>
              <TableCell>{formatCurrency(Number(row.value))}</TableCell>
              <TableCell>{formatCurrency(Number(row.recognizedIncome))}</TableCell>
              <TableCell>{formatCurrency(Number(row.recognizedCost))}</TableCell>
              <TableCell>{formatCurrency(Number(row.profit))}</TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/projects/${row.id}`}>Detail</Link>
                  </Button>

                  <Button asChild size="sm" variant="outline">
                    <Link href={`/projects/${row.id}/edit`}>Edit</Link>
                  </Button>

                  <DeleteButton action={deleteProjectAction} id={row.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}