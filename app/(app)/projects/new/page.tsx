import { ProjectForm } from "@/components/forms/project-form";
import { PageHeader } from "@/components/shared/page-header";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { toOptions } from "@/lib/options";
import { getMasterDataOptions } from "@/lib/services/master-data";

export default async function NewProjectPage() {
  const user = await requireUser();
  const master = await getMasterDataOptions(user);

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title="Buat project baru"
        description="Gunakan modul ini untuk wedding, studio session, media campaign, visual production, maupun attire order."
      />

      <ProjectForm
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
