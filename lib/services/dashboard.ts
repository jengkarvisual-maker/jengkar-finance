import "server-only";

import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import {
  buildDateRange,
  createEmptyProfitLossBuckets,
  decimalToNumber,
  finalizeProfitLossBuckets,
  getLast12MonthsSeries,
  resolveScopedBrandWhere,
  summarizeProfitLossTransactions,
} from "@/lib/services/helpers";

export async function getDashboardData(user: SessionUser, brandId?: string) {
  const brandWhere = resolveScopedBrandWhere(user, brandId);
  const currentRange = buildDateRange();

  const previousStart = new Date(
    currentRange.start.getFullYear(),
    currentRange.start.getMonth() - 1,
    1,
  );
  const previousEnd = new Date(
    currentRange.start.getFullYear(),
    currentRange.start.getMonth(),
    0,
    23,
    59,
    59,
  );

  const series = getLast12MonthsSeries();
  const chartStart = series[0]?.start ?? currentRange.start;
  const chartEnd = series.at(-1)?.end ?? currentRange.end;

  const [transactions, invoices, vendorBills, brands, cashTotals] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        status: "POSTED",
        brandId: brandWhere,
        transactionDate: {
          gte: previousStart < chartStart ? previousStart : chartStart,
          lte: currentRange.end > chartEnd ? currentRange.end : chartEnd,
        },
      },
      include: {
        brand: true,
        account: true,
        category: true,
      },
      orderBy: { transactionDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: {
        brandId: brandWhere,
        status: {
          in: ["UNPAID", "PARTIAL", "OVERDUE"],
        },
      },
      include: { brand: true },
    }),
    prisma.vendorBill.findMany({
      where: {
        brandId: brandWhere,
        status: {
          in: ["UNPAID", "PARTIAL", "OVERDUE"],
        },
      },
      include: { brand: true },
    }),
    prisma.brand.findMany({
      where: brandWhere ? { id: brandWhere } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.transaction.aggregate({
      where: {
        status: "POSTED",
        brandId: brandWhere,
      },
      _sum: {
        amountIn: true,
        amountOut: true,
      },
    }),
  ]);

  const summarizeProfitLoss = (items: typeof transactions) =>
    finalizeProfitLossBuckets(
      items.reduce((acc, tx) => {
        const buckets = summarizeProfitLossTransactions([tx]);
        acc.revenue += buckets.revenue;
        acc.cogs += buckets.cogs;
        acc.expense += buckets.expense;
        acc.otherIncome += buckets.otherIncome;
        acc.otherExpense += buckets.otherExpense;
        return acc;
      }, createEmptyProfitLossBuckets()),
    );

  const currentTransactions = transactions.filter(
    (tx) =>
      tx.transactionDate >= currentRange.start && tx.transactionDate <= currentRange.end,
  );
  const previousTransactions = transactions.filter(
    (tx) => tx.transactionDate >= previousStart && tx.transactionDate <= previousEnd,
  );

  const currentSummary = summarizeProfitLoss(currentTransactions);
  const previousSummary = summarizeProfitLoss(previousTransactions);

  const brandPerformance = brands
    .map((brand) => {
      const brandTransactions = currentTransactions.filter(
        (tx) => tx.brandId === brand.id,
      );
      const summary = summarizeProfitLoss(brandTransactions);

      return {
        brandId: brand.id,
        brandName: brand.name,
        revenue: summary.revenue,
        profit: summary.netProfit,
        expense: summary.totalExpense,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const monthlySeries = series.map((point) => {
    const pointTransactions = transactions.filter(
      (tx) => tx.transactionDate >= point.start && tx.transactionDate <= point.end,
    );

    const profitLoss = summarizeProfitLoss(pointTransactions);
    const cashFlow = pointTransactions.reduce(
      (sum, tx) => sum + decimalToNumber(tx.amountIn) - decimalToNumber(tx.amountOut),
      0,
    );

    return {
      label: point.label,
      omzet: profitLoss.revenue,
      pengeluaran: profitLoss.totalExpense,
      labaBersih: profitLoss.netProfit,
      cashFlow,
    };
  });

  const expenseComposition = currentTransactions.reduce<Record<string, number>>(
    (acc, tx) => {
      const amountOut = decimalToNumber(tx.amountOut);

      if (
        amountOut <= 0 ||
        !["COST_OF_GOODS_SOLD", "EXPENSE", "OTHER_EXPENSE"].includes(
          tx.account?.category ?? "",
        )
      ) {
        return acc;
      }

      const key = tx.category?.name ?? "Tanpa Kategori";
      acc[key] = (acc[key] ?? 0) + amountOut;
      return acc;
    },
    {},
  );

  return {
    metrics: {
      omzetThisMonth: currentSummary.revenue,
      expenseThisMonth: currentSummary.totalExpense,
      netProfitThisMonth: currentSummary.netProfit,
      outstandingReceivables: invoices.reduce(
        (sum, row) => sum + decimalToNumber(row.outstandingAmount),
        0,
      ),
      outstandingPayables: vendorBills.reduce(
        (sum, row) => sum + decimalToNumber(row.outstandingAmount),
        0,
      ),
      currentCashBalance:
        decimalToNumber(cashTotals._sum.amountIn) -
        decimalToNumber(cashTotals._sum.amountOut),
      topRevenueBrand: brandPerformance[0] ?? null,
      topProfitBrand:
        [...brandPerformance].sort((a, b) => b.profit - a.profit)[0] ?? null,
      omzetPrevMonth: previousSummary.revenue,
      profitPrevMonth: previousSummary.netProfit,
    },
    charts: {
      monthly: monthlySeries,
      incomePerBrand: brandPerformance.map((item) => ({
        label: item.brandName,
        value: item.revenue,
      })),
      expensePerBrand: brands.map((brand) => ({
        label: brand.name,
        value: currentTransactions
          .filter((tx) => tx.brandId === brand.id)
          .reduce((sum, tx) => sum + decimalToNumber(tx.amountOut), 0),
      })),
      expenseComposition: Object.entries(expenseComposition).map(([label, value]) => ({
        label,
        value,
      })),
      receivablesByBrand: brands.map((brand) => ({
        label: brand.name,
        value: invoices
          .filter((item) => item.brandId === brand.id)
          .reduce((sum, item) => sum + decimalToNumber(item.outstandingAmount), 0),
      })),
    },
    highlights: {
      overdueReceivables: invoices.filter((item) => item.status === "OVERDUE").length,
      overduePayables: vendorBills.filter((item) => item.status === "OVERDUE").length,
    },
  };
}
