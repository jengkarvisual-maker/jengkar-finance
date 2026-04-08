import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { SessionUser } from "@/lib/permissions";

type AppShellProps = {
  children: React.ReactNode;
  user: SessionUser;
};

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="page-shell lg:flex">
      <Sidebar user={user} />
      <div className="min-h-screen flex-1">
        <Topbar user={user} />
        <main className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
