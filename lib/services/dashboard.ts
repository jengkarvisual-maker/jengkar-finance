import "server-only";

import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import {
  buildDateRange,
  decimalToNumber,
  getLast12MonthsSeries,
  resolveScopedBrandWhere,
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

  const [transactions, invoices, vendorBills, brands] = await Promise.all([
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
  ]);

  const summarize = (items: typeof transactions) =>
    items.reduce(
      (acc, tx) => {
        acc.income += decimalToNumber(tx.amountIn);
        acc.expense += decimalToNumber(tx.amountOut);
        return acc;
      },
      { income: 0, expense: 0 },
    );

  const currentTransactions = transactions.filter(
    (tx) =>
      tx.transactionDate >= currentRange.start && tx.transactionDate <= currentRange.end,
  );
  const previousTransactions = transactions.filter(
    (tx) => tx.transactionDate >= previousStart && tx.transactionDate <= previousEnd,
  );

  const currentSummary = summarize(currentTransactions);
  const previousSummary = summarize(previousTransactions);
  const currentProfit = currentSummary.income - currentSummary.expense;
  const previousProfit = previousSummary.income - previousSummary.expense;

  const brandPerformance = brands
    .map((brand) => {
      const brandTransactions = currentTransactions.filter(
        (tx) => tx.brandId === brand.id,
      );
      const revenue = brandTransactions.reduce(
        (sum, tx) => sum + decimalToNumber(tx.amountIn),
        0,
      );
      const expense = brandTransactions.reduce(
        (sum, tx) => sum + decimalToNumber(tx.amountOut),
        0,
      );

      return {
        brandId: brand.id,
        brandName: brand.name,
        revenue,
        profit: revenue - expense,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const monthlySeries = series.map((point) => {
    const pointTransactions = transactions.filter(
      (tx) => tx.transactionDate >= point.start && tx.transactionDate <= point.end,
    );

    const omzet = pointTransactions.reduce(
      (sum, tx) => sum + decimalToNumber(tx.amountIn),
      0,
    );
    const pengeluaran = pointTransactions.reduce(
      (sum, tx) => sum + decimalToNumber(tx.amountOut),
      0,
    );

    return {
      label: point.label,
      omzet,
      pengeluaran,
      labaBersih: omzet - pengeluaran,
      cashFlow: omzet - pengeluaran,
    };
  });

  const expenseComposition = currentTransactions.reduce<Record<string, number>>(
    (acc, tx) => {
      const amountOut = decimalToNumber(tx.amountOut);

      if (amountOut <= 0) {
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
      omzetThisMonth: currentSummary.income,
      expenseThisMonth: currentSummary.expense,
      netProfitThisMonth: currentProfit,
      outstandingReceivables: invoices.reduce(
        (sum, row) => sum + decimalToNumber(row.outstandingAmount),
        0,
      ),
      outstandingPayables: vendorBills.reduce(
        (sum, row) => sum + decimalToNumber(row.outstandingAmount),
        0,
      ),
      currentCashBalance:
        transactions.reduce((sum, tx) => sum + decimalToNumber(tx.amountIn), 0) -
        transactions.reduce((sum, tx) => sum + decimalToNumber(tx.amountOut), 0),
      topRevenueBrand: brandPerformance[0] ?? null,
      topProfitBrand:
        [...brandPerformance].sort((a, b) => b.profit - a.profit)[0] ?? null,
      omzetPrevMonth: previousSummary.income,
      profitPrevMonth: previousProfit,
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
