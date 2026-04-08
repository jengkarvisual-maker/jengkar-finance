import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";

export async function requireAdminOrOwner() {
  const user = await requireUser();

  if (!["OWNER", "ADMIN"].includes(user.role.key)) {
    redirect("/dashboard");
  }

  return user;
}
