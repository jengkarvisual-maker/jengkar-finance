import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { canAccessFinanceWorkspace } from "@/lib/permissions";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (!canAccessFinanceWorkspace(session)) {
    redirect("/access-denied");
  }

  redirect("/dashboard");
}
