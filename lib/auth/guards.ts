import { redirect } from "next/navigation";

import { requireFinanceWorkspaceUser } from "@/lib/auth/session";

export async function requireAdminOrOwner() {
  const user = await requireFinanceWorkspaceUser();

  if (!["OWNER", "ADMIN"].includes(user.role.key)) {
    redirect("/dashboard");
  }

  return user;
}
