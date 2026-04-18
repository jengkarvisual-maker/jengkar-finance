import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { canAccessFinanceWorkspace } from "@/lib/permissions";

export default async function AccessDeniedPage() {
  const user = await requireUser();

  if (canAccessFinanceWorkspace(user)) {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-[32px] border border-border/70 bg-white/85 p-8 soft-shadow">
        <div className="metric-chip">Akses terbatas</div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
          Akun ini belum memiliki akses ke modul Finance.
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          Login Anda sudah dikenali, tetapi role akun ini tidak dibuka untuk data
          keuangan. Silakan gunakan portal Rumah Jengkar atau masuk ke aplikasi lain
          yang sesuai dengan kebutuhan kerja Anda.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex h-12 items-center justify-center rounded-full border border-border/70 bg-white px-5 text-sm font-semibold text-foreground transition hover:border-primary/25 hover:bg-primary/5"
            href="https://rumahjengkar.com"
          >
            Kembali ke portal
          </Link>
          <form action={logoutAction}>
            <button
              className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/90"
              type="submit"
            >
              Keluar dari akun ini
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
