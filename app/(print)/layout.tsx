import { requireFinanceWorkspaceUser } from "@/lib/auth/session";

export default async function PrintLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireFinanceWorkspaceUser();

  return children;
}
