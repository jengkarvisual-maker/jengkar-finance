import Link from "next/link";

import { DataMaintenanceForms } from "@/components/forms/data-maintenance-forms";
import { PageHeader } from "@/components/shared/page-header";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { ResetUserPasswordForm } from "@/components/forms/reset-user-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { INTERNAL_APP_LINKS } from "@/lib/constants";
import { getFinanceUserRoleLabel } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { listUsers } from "@/lib/services/master-data";
import { formatDateTime } from "@/lib/utils";

export default async function AccountSecurityPage() {
  const user = await requireUser();
  const canResetOthers = ["OWNER", "ADMIN"].includes(user.role.key);
  const users = canResetOthers ? await listUsers() : [];
  const maintenanceHistory =
    user.role.key === "OWNER"
      ? await prisma.activityLog.findMany({
          where: {
            entityType: "DataMaintenance",
            action: {
              in: ["DELETE", "EXPORT"],
            },
          },
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        })
      : [];

  const resettableUsers = users
    .filter((item) => item.id !== user.id)
    .filter((item) =>
      user.role.key === "OWNER"
        ? true
        : ["FINANCE_STAFF", "TEAM_MEMBER"].includes(item.role.key),
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      roleName: getFinanceUserRoleLabel(item),
      roleKey: item.role.key,
      status: item.status,
    }));

  return (
    <>
      <PageHeader
        eyebrow="Akun"
        title="Keamanan akun"
        description="Kelola password akun sendiri dan, untuk role tertentu, bantu reset password user internal lainnya."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <div className="metric-chip">Akun Saya</div>
            <CardTitle>Ubah password</CardTitle>
            <CardDescription>
              Gunakan password baru yang kuat dan hanya diketahui oleh pemilik akun.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        {canResetOthers ? (
          <Card className="border-border/70 bg-white/80">
            <CardHeader>
              <div className="metric-chip">Admin Tools</div>
              <CardTitle>Reset password user</CardTitle>
              <CardDescription>
                {user.role.key === "OWNER"
                  ? "Owner bisa membantu reset password user lain saat mereka kehilangan akses."
                  : "Admin bisa membantu reset password akun finance staff dan team member."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResetUserPasswordForm users={resettableUsers} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {user.role.key === "OWNER" ? (
        <Card className="border-border/70 bg-white/80">
          <CardHeader>
            <div className="metric-chip">Data Maintenance</div>
            <CardTitle>Pembersihan data periodik</CardTitle>
            <CardDescription>
              Bersihkan data operasional mentah berdasarkan rentang periode agar ukuran database
              tetap aman di plan gratis, tanpa menyentuh data finansial final.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[24px] border border-border/70 bg-white/72 px-4 py-4 text-sm leading-6 text-muted-foreground">
              Gunakan preview terlebih dahulu sebelum menghapus. Fokuskan pembersihan pada activity
              log dan dokumen draft lama, lalu tetap lakukan backup Supabase sebelum menjalankan
              penghapusan dalam jumlah besar.
            </div>

            <DataMaintenanceForms />

            <div className="rounded-[24px] border border-border/70 bg-white/72">
              <div className="border-b border-border/70 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Riwayat maintenance terbaru</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Jejak export dan penghapusan data terakhir akan muncul di sini agar Owner mudah
                  mengecek siapa yang melakukan maintenance dan kapan dilakukan.
                </p>
              </div>

              {maintenanceHistory.length > 0 ? (
                <div className="divide-y divide-border/70">
                  {maintenanceHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={item.action === "DELETE" ? "warning" : "muted"}>
                            {item.action === "DELETE" ? "Hapus" : "Export"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {item.user?.name ?? "Sistem"}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-foreground">{item.description}</p>
                      </div>
                      <p className="shrink-0 text-sm text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-6 text-sm leading-6 text-muted-foreground">
                  Belum ada riwayat maintenance. Setelah Owner melakukan export atau pembersihan
                  data, jejak aktivitasnya akan tampil di sini.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-white/80">
        <CardHeader>
          <div className="metric-chip">Jaringan App</div>
          <CardTitle>Akses aplikasi Rumah Jengkar</CardTitle>
          <CardDescription>
            Gunakan domain khusus per aplikasi agar navigasi internal lebih rapi dan mudah diingat tim.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {INTERNAL_APP_LINKS.map((app) => {
            const statusVariant =
              app.status === "active"
                ? "success"
                : app.status === "setup"
                  ? "warning"
                  : "muted";

            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.domain}</p>
                  </div>
                  <Badge variant={statusVariant}>{getStatusLabel(app.status)}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {app.description}
                </p>
              </>
            );

            return app.href ? (
              <Link
                key={app.name}
                href={app.href}
                className="rounded-[24px] border border-border/70 bg-white/72 px-4 py-4 transition hover:border-primary/25 hover:bg-white"
              >
                {content}
              </Link>
            ) : (
              <div
                key={app.name}
                className="rounded-[24px] border border-dashed border-border/70 bg-white/55 px-4 py-4"
              >
                {content}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

function getStatusLabel(status: "active" | "setup" | "planned") {
  switch (status) {
    case "active":
      return "Aktif";
    case "setup":
      return "Disiapkan";
    case "planned":
      return "Direncanakan";
  }
}
