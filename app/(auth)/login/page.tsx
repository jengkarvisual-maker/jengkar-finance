import { LoginForm } from "@/components/forms/login-form";
import { INTERNAL_APP_LINKS } from "@/lib/constants";

export default function LoginPage() {
  return (
    <div className="page-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,178,145,0.28),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(221,177,124,0.2),transparent_26%)]" />

      <div className="relative z-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="rounded-[36px] border border-border/70 bg-white/72 p-8 soft-shadow lg:p-12">
          <div className="space-y-6">
            <div className="metric-chip">Finance Operating System</div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground lg:text-6xl">
                Kendalikan cash flow kreatif lintas brand dalam satu dashboard.
              </h1>

              <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:text-lg">
                Dirancang untuk admin non-akuntansi, tetapi cukup kuat untuk owner
                melihat omzet, laba, piutang, hutang, aset, dan performa project
                seluruh grup Rumah Jengkar secara konsolidasi.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                "Dashboard konsolidasi multi-brand",
                "Transaksi project berbasis DP dan pelunasan",
                "Laporan laba rugi, cash flow, dan aset",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-border/70 bg-white/80 p-4 text-sm leading-6 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-border/70 bg-white/78 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Aplikasi Rumah Jengkar
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {INTERNAL_APP_LINKS.map((app) =>
                  app.href ? (
                    <a
                      key={app.name}
                      href={app.href}
                      className="rounded-[22px] border border-border/70 bg-white/80 px-4 py-4 transition hover:border-primary/25 hover:bg-white"
                    >
                      <p className="font-semibold text-foreground">{app.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{app.domain}</p>
                    </a>
                  ) : (
                    <div
                      key={app.name}
                      className="rounded-[22px] border border-dashed border-border/70 bg-white/55 px-4 py-4"
                    >
                      <p className="font-semibold text-foreground">{app.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{app.domain}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
