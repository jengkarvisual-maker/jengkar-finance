import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { canAccessFinanceWorkspace } from "@/lib/permissions";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  if (!canAccessFinanceWorkspace(user)) {
    redirect("/access-denied");
  }

  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  );
}
