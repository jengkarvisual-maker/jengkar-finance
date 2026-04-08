import { notFound } from "next/navigation";

import { BrandBarChart, TrendLineChart } from "@/components/dashboard/chart-panels";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/lib/services/dashboard";

export default async function BrandDashboardPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const user = await requireUser();
  const brands = await prisma.brand.findMany({
  orderBy: { name: "asc" },
});

  const brand = await prisma.brand.findUnique({
    where: { slug: brandId },
  });

  if (!brand) {
    notFound();
  }

  const dashboard = await getDashboardData(user, brand.id);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
  <PageHeader
    eyebrow="Dashboard per brand"
    title={brand.name}
    description="Ringkasan performa brand untuk omzet, pengeluaran, laba, cash flow, dan outstanding receivables secara lebih fokus."
  />

  <BrandSelector brands={brands} currentSlug={brandId} />
</div>

      <section className="section-grid">
        <MetricCard label="Omzet brand" value={dashboard.metrics.omzetThisMonth} />
        <MetricCard label="Pengeluaran brand" value={dashboard.metrics.expenseThisMonth} />
        <MetricCard label="Laba bersih brand" value={dashboard.metrics.netProfitThisMonth} />
        <MetricCard label="Piutang brand" value={dashboard.metrics.outstandingReceivables} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <TrendLineChart
          title="Pendapatan vs pengeluaran"
          description="Tren 12 bulan khusus brand ini."
          data={dashboard.charts.monthly}
        />
        <BrandBarChart
          title="Cash flow"
          description="Perbandingan net cash per bulan."
          data={dashboard.charts.monthly.map((item) => ({
            label: item.label,
            value: item.cashFlow ?? 0,
          }))}
          color="#355E3B"
        />
      </section>
    </>
  );
}
