"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { INTERNAL_APP_LINKS } from "@/lib/constants";
import { getFinanceUserRoleLabel } from "@/lib/permissions";
import { sidebarSections } from "@/lib/navigation";
import type { SessionUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type SidebarProps = {
  user: SessionUser;
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const visibleSections = sidebarSections;

  return (
    <aside className="glass-panel sticky top-0 hidden h-screen w-[280px] flex-col border-r border-border/70 px-5 py-6 lg:flex">
      <div className="space-y-6">
        <div className="space-y-3 rounded-[28px] border border-border/70 bg-white/80 p-5">
          <div className="metric-chip">Internal Finance OS</div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              RUMAH JENGKAR FINANCE
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Konsolidasi multi-brand untuk operasional kreatif.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-border/70 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Signed in as
          </p>
          <div className="mt-2 space-y-1">
            <p className="font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              {getFinanceUserRoleLabel(user)} - {user.email}
            </p>
          </div>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pr-2">
        {visibleSections.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "button-press flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_14px_40px_-24px_rgba(47,104,72,0.95)]"
                        : "text-muted-foreground hover:bg-white/80 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Aplikasi Jengkar
            </p>
            <Badge variant="muted">Lintas app</Badge>
          </div>
          <div className="space-y-3">
            {INTERNAL_APP_LINKS.map((app) => {
              const statusVariant =
                app.status === "active"
                  ? "success"
                  : app.status === "setup"
                    ? "warning"
                    : "muted";

              return app.href ? (
                <a
                  key={app.name}
                  href={app.href}
                  className="button-press block rounded-[24px] border border-border/70 bg-white/70 px-4 py-4 transition hover:border-primary/30 hover:bg-white/85"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.domain}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant}>{getStatusLabel(app.status)}</Badge>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {app.description}
                  </p>
                </a>
              ) : (
                <div
                  key={app.name}
                  className="rounded-[24px] border border-dashed border-border/70 bg-white/50 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.domain}</p>
                    </div>
                    <Badge variant={statusVariant}>{getStatusLabel(app.status)}</Badge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {app.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}

function getStatusLabel(status: "active" | "setup" | "planned") {
  switch (status) {
    case "active":
      return "Aktif";
    case "setup":
      return "Disiapkan";
    case "planned":
      return "Direncanakan";
  }
}
