import { requireUser } from "@/lib/auth/session";

export default async function PrintLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireUser();

  return children;
}
