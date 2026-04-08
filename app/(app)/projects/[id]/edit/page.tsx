import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/forms/project-form";
import { PageHeader } from "@/components/shared/page-header";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { toDateInputValue, toOptions } from "@/lib/options";
import { getProjectById } from "@/lib/services/finance";
import { getMasterDataOptions } from "@/lib/services/master-data";

type FormProjectStatus = "LEAD" | "BOOKED" | "ONGOING" | "DONE" | "CANCELLED";

function normalizeProjectStatus(status: string | null | undefined): FormProjectStatus | undefined {
  switch (status) {
    case "LEAD":
    case "BOOKED":
    case "ONGOING":
    case "DONE":
    case "CANCELLED":
      return status;
    default:
      return undefined;
  }
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [master, project] = await Promise.all([
    getMasterDataOptions(user),
    getProjectById(user, id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title={`Edit ${project.projectCode}`}
        description="Perubahan project akan memengaruhi tracking profit dan relasi transaksi / invoice."
      />

      <ProjectForm
        id={project.id}
        defaultValues={{
          projectCode: project.projectCode,
          name: project.name,
          brandId: project.brandId,
          clientId: project.clientId,
          projectDate: toDateInputValue(project.projectDate),
          value: Number(project.value),
          status: normalizeProjectStatus(project.status),
          notes: project.notes ?? "",
        }}
        brands={toOptions(master.brands, (item) => item.id, (item) => item.name)}
        clients={toOptions(master.clients, (item) => item.id, (item) => item.name)}
        statuses={PROJECT_STATUS_OPTIONS.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
      />
    </>
  );
}