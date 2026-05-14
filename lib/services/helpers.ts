import "server-only";

import type { InvoiceStatus, Prisma, VendorBillStatus } from "@prisma/client";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

import type { SessionUser } from "@/lib/permissions";
import { canAccessBrand, getAllowedBrandIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { serialNumber } from "@/lib/utils";

export function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

export function resolveProjectValueNumber(project: {
  totalValue?: Prisma.Decimal | number | string | null;
  value?: Prisma.Decimal | number | string | null;
}) {
  const totalValue = decimalToNumber(project.totalValue);
  const legacyValue = decimalToNumber(project.value);

  if (totalValue === 0 && legacyValue > 0) {
    return legacyValue;
  }

  return totalValue;
}

export type ProfitLossBuckets = {
  revenue: number;
  cogs: number;
  expense: number;
  otherIncome: number;
  otherExpense: number;
  grossProfit: number;
  totalExpense: number;
  netProfit: number;
};

type ProfitLossLikeTransaction = {
  amountIn?: Prisma.Decimal | number | string | null;
  amountOut?: Prisma.Decimal | number | string | null;
  account?: {
    category?: string | null;
  } | null;
};

export function createEmptyProfitLossBuckets(): ProfitLossBuckets {
  return {
    revenue: 0,
    cogs: 0,
    expense: 0,
    otherIncome: 0,
    otherExpense: 0,
    grossProfit: 0,
    totalExpense: 0,
    netProfit: 0,
  };
}

export function finalizeProfitLossBuckets(
  buckets: Omit<ProfitLossBuckets, "grossProfit" | "totalExpense" | "netProfit">,
): ProfitLossBuckets {
  const grossProfit = buckets.revenue - buckets.cogs;
  const totalExpense = buckets.cogs + buckets.expense + buckets.otherExpense;
  const netProfit =
    buckets.revenue -
    buckets.cogs -
    buckets.expense +
    buckets.otherIncome -
    buckets.otherExpense;

  return {
    ...buckets,
    grossProfit,
    totalExpense,
    netProfit,
  };
}

export function summarizeProfitLossTransactions(
  transactions: ProfitLossLikeTransaction[],
): ProfitLossBuckets {
  const buckets = transactions.reduce(
    (acc, tx) => {
      const amountIn = decimalToNumber(tx.amountIn);
      const amountOut = decimalToNumber(tx.amountOut);

      switch (tx.account?.category) {
        case "REVENUE":
          acc.revenue += amountIn;
          break;
        case "COST_OF_GOODS_SOLD":
          acc.cogs += amountOut;
          break;
        case "EXPENSE":
          acc.expense += amountOut;
          break;
        case "OTHER_INCOME":
          acc.otherIncome += amountIn;
          break;
        case "OTHER_EXPENSE":
          acc.otherExpense += amountOut;
          break;
        default:
          break;
      }

      return acc;
    },
    createEmptyProfitLossBuckets(),
  );

  return finalizeProfitLossBuckets(buckets);
}

export function buildDateRange(input?: {
  from?: string;
  to?: string;
  month?: string;
  year?: string;
}) {
  if (input?.from || input?.to) {
    return {
      start: input.from ? new Date(input.from) : new Date("2000-01-01"),
      end: input.to ? new Date(`${input.to}T23:59:59.999`) : new Date(),
    };
  }

  if (input?.month && input?.year) {
    const monthIndex = Number(input.month) - 1;
    const year = Number(input.year);
    const anchor = new Date(year, monthIndex, 1);

    return {
      start: startOfMonth(anchor),
      end: endOfMonth(anchor),
    };
  }

  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

export function getLast12MonthsSeries() {
  return Array.from({ length: 12 }).map((_, index) => {
    const date = subMonths(startOfMonth(new Date()), 11 - index);
    return {
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM yy"),
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  });
}

export function resolveScopedBrandWhere(
  user: SessionUser,
  requestedBrandId?: string,
): Prisma.StringFilter | string | undefined {
  if (requestedBrandId) {
    if (!canAccessBrand(user, requestedBrandId)) {
      throw new Error("Kamu tidak punya akses ke brand tersebut.");
    }

    return requestedBrandId;
  }

  const allowedBrandIds = getAllowedBrandIds(user);

  if (!allowedBrandIds) {
    return undefined;
  }

  return {
    in: allowedBrandIds,
  };
}

export async function generateDocumentNumber(prefix: string) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
  );

  const count = await prisma.transaction.count({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  return serialNumber(prefix, today, count + 1);
}

export function resolveInvoiceStatus(
  totalAmount: number,
  amountPaid: number,
  dueDate: Date,
): InvoiceStatus {
  if (amountPaid <= 0) {
    return dueDate < new Date() ? "OVERDUE" : "UNPAID";
  }

  if (amountPaid < totalAmount) {
    return dueDate < new Date() ? "OVERDUE" : "PARTIAL";
  }

  return "PAID";
}

export function resolveVendorBillStatus(
  totalAmount: number,
  amountPaid: number,
  dueDate: Date,
): VendorBillStatus {
  if (amountPaid <= 0) {
    return dueDate < new Date() ? "OVERDUE" : "UNPAID";
  }

  if (amountPaid < totalAmount) {
    return dueDate < new Date() ? "OVERDUE" : "PARTIAL";
  }

  return "PAID";
}
