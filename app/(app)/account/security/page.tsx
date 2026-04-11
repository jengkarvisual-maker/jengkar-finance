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
import { requireUser } from "@/lib/auth/session";
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
        : item.role.key === "FINANCE_STAFF",
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
                  : "Admin hanya bisa mereset password akun finance staff."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResetUserPasswordForm users={resettableUsers} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
