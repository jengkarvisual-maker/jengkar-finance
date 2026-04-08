"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sidebarSections } from "@/lib/navigation";
import type { SessionUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type SidebarProps = {
  user: SessionUser;
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const visibleSections = sidebarSections.filter((section) =>
    user.role.key === "FINANCE_STAFF" ? section.label !== "Master Data" : true,
  );

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
              {user.role.name} - {user.email}
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
                      "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all",
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
      </nav>
    </aside>
  );
}
