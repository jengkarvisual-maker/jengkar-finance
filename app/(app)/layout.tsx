import { AppShell } from "@/components/layout/app-shell";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireFinanceWorkspaceUser();

  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  );
}
