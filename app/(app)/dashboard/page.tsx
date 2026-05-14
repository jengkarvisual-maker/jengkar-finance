import { Building2, CircleAlert, Wallet } from "lucide-react";

import { BrandBarChart, CompositionPieChart, TrendLineChart } from "@/components/dashboard/chart-panels";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { listRecentActivities } from "@/lib/services/activity-log";
import { getDashboardData } from "@/lib/services/dashboard";
import { formatCurrency } from "@/lib/utils";

function getMetadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function summarizeUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return null;
  }

  return userAgent.length > 80 ? `${userAgent.slice(0, 77)}...` : userAgent;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [dashboard, recentActivities] = await Promise.all([
    getDashboardData(user),
    listRecentActivities(user),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Konsolidasi Rumah Jengkar"
        title="Dashboard utama keuangan grup"
        description="Ringkasan operasional lintas brand untuk omzet, pengeluaran, laba, piutang, hutang, dan cash flow dalam satu tampilan owner-friendly."
      />

      <section className="section-grid">
        <MetricCard
          label="Omzet bulan berjalan"
          value={dashboard.metrics.omzetThisMonth}
          previousValue={dashboard.metrics.omzetPrevMonth}
          hint="Revenue dibanding bulan lalu"
        />
        <MetricCard
          label="Beban bulan berjalan"
          value={dashboard.metrics.expenseThisMonth}
          hint="COGS, expense, dan other expense"
          compact
        />
        <MetricCard
          label="Laba bersih bulan berjalan"
          value={dashboard.metrics.netProfitThisMonth}
          previousValue={dashboard.metrics.profitPrevMonth}
          hint="Pendapatan dikurangi beban"
        />
        <MetricCard
          label="Saldo kas saat ini"
          value={dashboard.metrics.currentCashBalance}
          hint="Akumulasi all-time transaksi terposting"
        />
        <MetricCard
          label="Piutang outstanding"
          value={dashboard.metrics.outstandingReceivables}
          hint="Invoice unpaid / partial / overdue"
        />
        <MetricCard
          label="Hutang outstanding"
          value={dashboard.metrics.outstandingPayables}
          hint="Tagihan vendor belum lunas"
        />
        <MetricCard
          label="Brand omzet tertinggi"
          value={dashboard.metrics.topRevenueBrand?.revenue ?? 0}
          hint={dashboard.metrics.topRevenueBrand?.brandName ?? "Belum ada data"}
          compact
        />
        <MetricCard
          label="Brand laba tertinggi"
          value={dashboard.metrics.topProfitBrand?.profit ?? 0}
          hint={dashboard.metrics.topProfitBrand?.brandName ?? "Belum ada data"}
          compact
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <TrendLineChart
          title="Tren omzet, laba, dan pengeluaran"
          description="Pergerakan 12 bulan terakhir berdasarkan klasifikasi laba rugi yang sama dengan laporan P&L."
          data={dashboard.charts.monthly}
        />

        <div className="grid gap-6">
          <Card className="border-border/70 bg-white/75">
            <CardHeader>
              <CardTitle>Highlight owner</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="rounded-3xl border border-border/70 bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Brand terkuat bulan ini
                    </p>
                    <p className="text-muted-foreground">
                      {dashboard.metrics.topRevenueBrand?.brandName ?? "-"} mencatat omzet{" "}
                      {formatCurrency(dashboard.metrics.topRevenueBrand?.revenue ?? 0)}.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-border/70 bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <CircleAlert className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-foreground">Piutang dan hutang overdue</p>
                    <p className="text-muted-foreground">
                      {dashboard.highlights.overdueReceivables} invoice overdue dan{" "}
                      {dashboard.highlights.overduePayables} tagihan overdue butuh follow up.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-border/70 bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Cash reserve</p>
                    <p className="text-muted-foreground">
                      Posisi kas aktif berada di {formatCurrency(dashboard.metrics.currentCashBalance)}.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <CompositionPieChart
            title="Komposisi beban"
            description="Distribusi pengeluaran utama bulan berjalan berdasarkan kategori."
            data={dashboard.charts.expenseComposition}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <BrandBarChart
          title="Pemasukan per brand"
          description="Performa omzet brand selama bulan berjalan."
          data={dashboard.charts.incomePerBrand}
        />
        <BrandBarChart
          title="Pengeluaran per brand"
          description="Total beban yang memengaruhi laba per brand bulan berjalan."
          data={dashboard.charts.expensePerBrand}
          color="#9B6A5A"
        />
        <BrandBarChart
          title="Piutang outstanding"
          description="Akumulasi invoice yang belum lunas per brand."
          data={dashboard.charts.receivablesByBrand}
          color="#685B8C"
        />
      </section>

      <Card className="border-border/70 bg-white/75">
        <CardHeader>
        <CardTitle>Activity log terbaru</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {recentActivities.map((activity) => {
          const isOwnerLoginAudit = activity.entityType === "OwnerLogin";
          const ipAddress = getMetadataValue(activity.metadata, "ipAddress");
          const userAgent = summarizeUserAgent(
            getMetadataValue(activity.metadata, "userAgent"),
          );

          return (
            <div
              key={activity.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{activity.description}</p>
                  {isOwnerLoginAudit ? (
                    <Badge variant="warning">Audit Owner</Badge>
                  ) : null}
                </div>

                <p className="text-muted-foreground">
                  {activity.user?.name ?? "System"} - {activity.entityType}
                  {activity.brand ? ` - ${activity.brand.name}` : ""}
                </p>

                {isOwnerLoginAudit && (ipAddress || userAgent) ? (
                  <p className="text-xs text-muted-foreground">
                    {ipAddress ? `IP: ${ipAddress}` : "IP tidak terbaca"}
                    {userAgent ? ` - Device: ${userAgent}` : ""}
                  </p>
                ) : null}
              </div>

              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(activity.createdAt)}
              </p>
            </div>
          );
        })}
      </CardContent>
      </Card>
    </>
  );
}
