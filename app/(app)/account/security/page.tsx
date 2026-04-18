import Link from "next/link";

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
import { listUsers } from "@/lib/services/master-data";

export default async function AccountSecurityPage() {
  const user = await requireUser();
  const canResetOthers = ["OWNER", "ADMIN"].includes(user.role.key);
  const users = canResetOthers ? await listUsers() : [];

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
      roleName: item.role.name,
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
