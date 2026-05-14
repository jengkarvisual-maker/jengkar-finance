import "server-only";

import type { Prisma } from "@prisma/client";

import type { SessionUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  buildDateRange,
  decimalToNumber,
  createEmptyProfitLossBuckets,
  finalizeProfitLossBuckets,
  resolveProjectValueNumber,
  resolveInvoiceStatus,
  resolveScopedBrandWhere,
  resolveVendorBillStatus,
  summarizeProfitLossTransactions,
} from "@/lib/services/helpers";

type ListInput = {
  brandId?: string;
  projectId?: string;
  accountCategory?: string;
  from?: string;
  to?: string;
  month?: string;
  year?: string;
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number | "all";
};

const DEFAULT_PAGE_SIZE = 10;

function getPagination(page = 1, pageSize: number | "all" = DEFAULT_PAGE_SIZE) {
  if (pageSize === "all") {
    return {};
  }

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export async function recalculateInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      transactions: {
        where: { status: "POSTED" },
      },
    },
  });

  if (!invoice) {
    return null;
  }

  const amountPaid = invoice.transactions.reduce(
    (sum, tx) => sum + decimalToNumber(tx.amountIn),
    0,
  );

  const downPayment = invoice.transactions
    .filter((tx) => tx.transactionType === "CLIENT_DP")
    .reduce((sum, tx) => sum + decimalToNumber(tx.amountIn), 0);

  const totalAmount = decimalToNumber(invoice.totalAmount);
  const outstandingAmount = Math.max(totalAmount - amountPaid, 0);
  const status = resolveInvoiceStatus(totalAmount, amountPaid, invoice.dueDate);

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid,
      downPayment,
      outstandingAmount,
      status,
      paidAt: outstandingAmount <= 0 ? new Date() : null,
    },
  });
}

export async function recalculateVendorBill(vendorBillId: string) {
  const bill = await prisma.vendorBill.findUnique({
    where: { id: vendorBillId },
    include: {
      transactions: {
        where: { status: "POSTED" },
      },
    },
  });

  if (!bill) {
    return null;
  }

  const amountPaid = bill.transactions.reduce(
    (sum, tx) => sum + decimalToNumber(tx.amountOut),
    0,
  );

  const totalAmount = decimalToNumber(bill.totalAmount);
  const outstandingAmount = Math.max(totalAmount - amountPaid, 0);
  const status = resolveVendorBillStatus(totalAmount, amountPaid, bill.dueDate);

  return prisma.vendorBill.update({
    where: { id: vendorBillId },
    data: {
      amountPaid,
      outstandingAmount,
      status,
      paidAt: outstandingAmount <= 0 ? new Date() : null,
    },
  });
}

export async function recalculateProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      transactions: {
        where: { status: "POSTED" },
      },
    },
  });

  if (!project) {
    return null;
  }

  const recognizedIncome = project.transactions.reduce(
    (sum, tx) => sum + decimalToNumber(tx.amountIn),
    0,
  );

  const recognizedCost = project.transactions.reduce(
    (sum, tx) => sum + decimalToNumber(tx.amountOut),
    0,
  );

  const totalValue = resolveProjectValueNumber(project);
  const amountPaid = project.transactions
    .filter(
      (tx) =>
        tx.transactionType === "CLIENT_DP" ||
        tx.transactionType === "CLIENT_SETTLEMENT" ||
        tx.transactionType === "INCOME",
    )
    .reduce((sum, tx) => sum + decimalToNumber(tx.amountIn), 0);

  const outstandingAmount = Math.max(totalValue - amountPaid, 0);

  let paymentStatus: "UNPAID" | "DP" | "PARTIAL" | "PAID" = "UNPAID";

  if (amountPaid <= 0) {
    paymentStatus = "UNPAID";
  } else if (outstandingAmount <= 0) {
    paymentStatus = "PAID";
  } else if (
    project.transactions.some((tx) => tx.transactionType === "CLIENT_DP")
  ) {
    paymentStatus = "DP";
  } else {
    paymentStatus = "PARTIAL";
  }

  return prisma.project.update({
    where: { id: projectId },
    data: {
      recognizedIncome,
      recognizedCost,
      profit: recognizedIncome - recognizedCost,
      amountPaid,
      outstandingAmount,
      paymentStatus,
    },
  });
}

export async function listTransactions(user: SessionUser, filters: ListInput) {
  const brandWhere = resolveScopedBrandWhere(user, filters.brandId);
  const range = buildDateRange(filters);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.TransactionWhereInput = {
    brandId: brandWhere,
    transactionDate: {
      gte: range.start,
      lte: range.end,
    },
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.status ? { paymentStatus: filters.status as never } : {}),
    ...(filters.accountCategory
      ? {
          account: {
            is: {
              category: filters.accountCategory as never,
            },
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { transactionNo: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
            { referenceNo: { contains: filters.query, mode: "insensitive" } },
            {
              client: {
                is: {
                  name: { contains: filters.query, mode: "insensitive" },
                },
              },
            },
            {
              vendor: {
                is: {
                  name: { contains: filters.query, mode: "insensitive" },
                },
              },
            },
            {
              project: {
                is: {
                  name: { contains: filters.query, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };

  const args: Prisma.TransactionFindManyArgs = {
    where,
    include: {
      brand: true,
      category: true,
      account: true,
      client: true,
      vendor: true,
      project: true,
      paymentMethod: true,
      enteredBy: true,
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  };

  if (pageSize !== "all") {
    args.skip = (page - 1) * pageSize;
    args.take = pageSize;
  }

  const rows = await prisma.transaction.findMany(args);
  const total = await prisma.transaction.count({ where });

  return {
    rows,
    total,
    page,
    pageSize,
    totals: rows.reduce(
      (acc, row) => {
        acc.amountIn += decimalToNumber(row.amountIn);
        acc.amountOut += decimalToNumber(row.amountOut);
        return acc;
      },
      { amountIn: 0, amountOut: 0 },
    ),
  };
}

export async function getTransactionById(user: SessionUser, id: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      brand: true,
      category: true,
      account: true,
      client: true,
      vendor: true,
      project: true,
      paymentMethod: true,
      invoice: true,
      vendorBill: true,
    },
  });

  if (!transaction) {
    return null;
  }

  resolveScopedBrandWhere(user, transaction.brandId);

  return transaction;
}

export async function listInvoices(user: SessionUser, filters: ListInput) {
  const brandWhere = resolveScopedBrandWhere(user, filters.brandId);
  const hasDateFilter = Boolean(
    filters.from || filters.to || filters.month || filters.year,
  );
  const range = hasDateFilter ? buildDateRange(filters) : null;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.InvoiceWhereInput = {
    brandId: brandWhere,
    ...(range
      ? {
          invoiceDate: {
            gte: range.start,
            lte: range.end,
          },
        }
      : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.query
      ? {
          OR: [
            {
              invoiceNo: {
                contains: filters.query,
                mode: "insensitive",
              },
            },
            {
              client: {
                is: {
                  name: {
                    contains: filters.query,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              project: {
                is: {
                  name: {
                    contains: filters.query,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const args = {
    where,
    include: {
      brand: true,
      client: true,
      project: true,
    },
    orderBy: [
      { dueDate: "asc" },
      { invoiceDate: "desc" },
      { createdAt: "desc" },
    ],
    ...(pageSize === "all"
      ? {}
      : {
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
  } satisfies Prisma.InvoiceFindManyArgs;

  const rows = await prisma.invoice.findMany(args);
  const total = await prisma.invoice.count({ where });

  return {
    rows,
    total,
    page,
    pageSize,
    totals: rows.reduce(
      (acc, row) => {
        acc.totalAmount += decimalToNumber(row.totalAmount);
        acc.amountPaid += decimalToNumber(row.amountPaid);
        acc.downPayment += decimalToNumber(row.downPayment);
        acc.outstandingAmount += decimalToNumber(row.outstandingAmount);
        return acc;
      },
      {
        totalAmount: 0,
        amountPaid: 0,
        downPayment: 0,
        outstandingAmount: 0,
      },
    ),
  };
}

export async function getInvoiceById(user: SessionUser, id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      brand: true,
      client: true,
      project: true,
      transactions: {
        include: {
          paymentMethod: true,
          enteredBy: true,
        },
        orderBy: { transactionDate: "desc" },
      },
    },
  });

  if (!invoice) {
    return null;
  }

  resolveScopedBrandWhere(user, invoice.brandId);
  return invoice;
}

export async function listVendorBills(user: SessionUser, filters: ListInput) {
  const brandWhere = resolveScopedBrandWhere(user, filters.brandId);
  const hasDateFilter = Boolean(filters.from || filters.to || filters.month || filters.year);
  const range = hasDateFilter ? buildDateRange(filters) : null;

  const where: Prisma.VendorBillWhereInput = {
    brandId: brandWhere,
    ...(range
      ? {
          billDate: {
            gte: range.start,
            lte: range.end,
          },
        }
      : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.query
      ? {
          OR: [
            { billNo: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
            {
              vendor: {
                is: {
                  name: { contains: filters.query, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };

  const rows = await prisma.vendorBill.findMany({
    where,
    include: {
      brand: true,
      vendor: true,
      project: true,
    },
    orderBy: [{ dueDate: "asc" }, { billDate: "desc" }],
  });

  return {
    rows,
    totalOutstanding: rows.reduce(
      (sum, row) => sum + decimalToNumber(row.outstandingAmount),
      0,
    ),
  };
}

export async function getVendorBillById(user: SessionUser, id: string) {
  const bill = await prisma.vendorBill.findUnique({
    where: { id },
    include: {
      brand: true,
      vendor: true,
      project: true,
      transactions: {
        include: {
          paymentMethod: true,
          enteredBy: true,
        },
        orderBy: { transactionDate: "desc" },
      },
    },
  });

  if (!bill) {
    return null;
  }

  resolveScopedBrandWhere(user, bill.brandId);
  return bill;
}

export async function listAssets(user: SessionUser, filters: ListInput) {
  const brandWhere = resolveScopedBrandWhere(user, filters.brandId);

  return prisma.asset.findMany({
    where: {
      brandId: brandWhere,
      ...(filters.query
        ? {
            OR: [
              { assetCode: { contains: filters.query, mode: "insensitive" } },
              { name: { contains: filters.query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      brand: true,
      depreciations: {
        take: 3,
        orderBy: { periodStart: "desc" },
      },
    },
    orderBy: { purchaseDate: "desc" },
  });
}

export async function getAssetById(user: SessionUser, id: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      brand: true,
      depreciations: {
        orderBy: { periodStart: "desc" },
      },
    },
  });

  if (!asset) {
    return null;
  }

  resolveScopedBrandWhere(user, asset.brandId);
  return asset;
}

export async function listProjects(user: SessionUser, filters: ListInput) {
  const brandWhere = resolveScopedBrandWhere(user, filters.brandId);
  const hasDateFilter = Boolean(filters.from || filters.to || filters.month || filters.year);
  const range = hasDateFilter ? buildDateRange(filters) : null;

  return prisma.project.findMany({
    where: {
      brandId: brandWhere,
      ...(range
        ? {
            projectDate: {
              gte: range.start,
              lte: range.end,
            },
          }
        : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.query
        ? {
            OR: [
              { projectCode: { contains: filters.query, mode: "insensitive" } },
              { name: { contains: filters.query, mode: "insensitive" } },
              {
                client: {
                  is: {
                    name: { contains: filters.query, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      brand: true,
      client: true,
      _count: { select: { invoices: true, transactions: true } },
    },
    orderBy: [{ projectDate: "desc" }, { name: "asc" }],
  });
}

export async function getProjectById(user: SessionUser, id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      brand: true,
      client: true,
      invoices: true,
      vendorBills: true,
      transactions: {
        include: {
          account: true,
          category: true,
        },
        orderBy: { transactionDate: "desc" },
      },
    },
  });

  if (!project) {
    return null;
  }

  resolveScopedBrandWhere(user, project.brandId);
  return project;
}

export async function getProfitLossReport(user: SessionUser, filters: ListInput) {
  const brandWhere = resolveScopedBrandWhere(user, filters.brandId);
  const range = buildDateRange(filters);

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "POSTED",
      brandId: brandWhere,
      transactionDate: {
        gte: range.start,
        lte: range.end,
      },
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.accountCategory
        ? {
            account: { is: { category: filters.accountCategory as never } },
          }
        : {}),
    },
    include: {
      brand: true,
      account: true,
    },
    orderBy: [{ brand: { name: "asc" } }, { transactionDate: "asc" }],
  });

  const byBrand = new Map<
    string,
    {
      brandId: string;
      brandName: string;
      revenue: number;
      cogs: number;
      expense: number;
      otherIncome: number;
      otherExpense: number;
    }
  >();

  for (const tx of transactions) {
    const key = tx.brandId;
    const row =
      byBrand.get(key) ?? {
        brandId: tx.brandId,
        brandName: tx.brand.name,
        revenue: 0,
        cogs: 0,
        expense: 0,
        otherIncome: 0,
        otherExpense: 0,
      };

    const buckets = summarizeProfitLossTransactions([tx]);
    row.revenue += buckets.revenue;
    row.cogs += buckets.cogs;
    row.expense += buckets.expense;
    row.otherIncome += buckets.otherIncome;
    row.otherExpense += buckets.otherExpense;

    byBrand.set(key, row);
  }

  const rows = Array.from(byBrand.values()).map((row) => ({
    ...row,
    ...finalizeProfitLossBuckets({
      revenue: row.revenue,
      cogs: row.cogs,
      expense: row.expense,
      otherIncome: row.otherIncome,
      otherExpense: row.otherExpense,
    }),
  }));

  const summaryBuckets = rows.reduce(
    (acc, row) => {
      acc.revenue += row.revenue;
      acc.cogs += row.cogs;
      acc.expense += row.expense;
      acc.otherIncome += row.otherIncome;
      acc.otherExpense += row.otherExpense;
      return acc;
    },
    createEmptyProfitLossBuckets(),
  );

  return {
    range,
    rows,
    summary: finalizeProfitLossBuckets(summaryBuckets),
  };
}

export async function getCashFlowReport(user: SessionUser, filters: ListInput) {
  const brandWhere = resolveScopedBrandWhere(user, filters.brandId);
  const range = buildDateRange(filters);

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "POSTED",
      brandId: brandWhere,
      transactionDate: {
        gte: range.start,
        lte: range.end,
      },
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
    },
    include: {
      brand: true,
      category: true,
    },
    orderBy: { transactionDate: "asc" },
  });

  const monthlyMap = new Map<
    string,
    { label: string; inflow: number; outflow: number; net: number }
  >();

  for (const tx of transactions) {
    const date = tx.transactionDate;
    const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
    const row =
      monthlyMap.get(key) ?? {
        label: key,
        inflow: 0,
        outflow: 0,
        net: 0,
      };

    row.inflow += decimalToNumber(tx.amountIn);
    row.outflow += decimalToNumber(tx.amountOut);
    row.net = row.inflow - row.outflow;
    monthlyMap.set(key, row);
  }

  return {
    range,
    rows: Array.from(monthlyMap.values()),
    totals: transactions.reduce(
      (acc, tx) => {
        acc.inflow += decimalToNumber(tx.amountIn);
        acc.outflow += decimalToNumber(tx.amountOut);
        return acc;
      },
      { inflow: 0, outflow: 0 },
    ),
  };
}

export async function getAssetSummaryReport(user: SessionUser, filters: ListInput) {
  const assets = await listAssets(user, filters);

  return {
    rows: assets,
    totals: assets.reduce(
      (acc, asset) => {
        acc.purchasePrice += decimalToNumber(asset.purchasePrice);
        acc.accumulatedDepreciation += decimalToNumber(asset.accumulatedDepreciation);
        acc.bookValue += decimalToNumber(asset.bookValue);
        return acc;
      },
      {
        purchasePrice: 0,
        accumulatedDepreciation: 0,
        bookValue: 0,
      },
    ),
  };
}
