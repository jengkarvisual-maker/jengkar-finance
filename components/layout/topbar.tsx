import Link from "next/link";
import { CalendarDays, KeyRound, LogOut, Search } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TopbarProps = {
  user: SessionUser;
};

export function Topbar({ user }: TopbarProps) {
  const accessibleBrands = user.allBrandsAccess
    ? "Semua brand"
    : `${user.brandAccesses.length} brand`;
  const profileHref = "/account/security";

  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-border/70">
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex flex-1 items-center gap-3 rounded-[24px] border border-border/70 bg-white/70 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            disabled
            placeholder="Global search akan aktif saat layer search terhubung ke database."
            className="h-auto border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Brand scope
            </p>
            <p className="font-semibold text-foreground">{accessibleBrands}</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDate(new Date())}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm lg:block">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Role
              </p>
              <p className="font-semibold text-foreground">{user.role.name}</p>
            </div>

            <Button variant="secondary" asChild>
              <Link href={profileHref}>
                <KeyRound className="h-4 w-4" />
                Keamanan Akun
              </Link>
            </Button>
          </div>

          <form action={logoutAction}>
            <Button variant="outline" type="submit">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
