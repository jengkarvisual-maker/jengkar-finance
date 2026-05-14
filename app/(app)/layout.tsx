import { AppShell } from "@/components/layout/app-shell";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
