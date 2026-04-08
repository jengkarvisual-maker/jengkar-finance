import "server-only";

import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { resolveScopedBrandWhere } from "@/lib/services/helpers";

export async function getMasterDataOptions(user: SessionUser) {
  const scopedBrandWhere = resolveScopedBrandWhere(user);

  const brands = await prisma.brand.findMany({
    where: scopedBrandWhere ? { id: scopedBrandWhere } : undefined,
    orderBy: { name: "asc" },
  });

  const categories = await prisma.transactionCategory.findMany({
    orderBy: [{ transactionType: "asc" }, { name: "asc" }],
  });

  const accounts = await prisma.account.findMany({
    where: scopedBrandWhere
      ? {
          OR: [{ brandId: null }, { brandId: scopedBrandWhere }],
        }
      : undefined,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
  });

  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
  });

  const paymentMethods = await prisma.paymentMethod.findMany({
    orderBy: { name: "asc" },
  });

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
  });

  return {
    brands,
    categories,
    accounts,
    clients,
    vendors,
    paymentMethods,
    users,
  };
}

export async function listBrands(user: SessionUser) {
  const brandWhere = resolveScopedBrandWhere(user);

  return prisma.brand.findMany({
    where: brandWhere ? { id: brandWhere } : undefined,
    include: {
      _count: {
        select: {
          projects: true,
          transactions: true,
          invoices: true,
          vendorBills: true,
          assets: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listAccounts(user: SessionUser) {
  const brandWhere = resolveScopedBrandWhere(user);

  return prisma.account.findMany({
    where: brandWhere
      ? {
          OR: [{ brandId: null }, { brandId: brandWhere }],
        }
      : undefined,
    include: {
      brand: true,
      _count: { select: { transactions: true } },
    },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });
}

export async function listClients() {
  return prisma.client.findMany({
    include: {
      _count: {
        select: { invoices: true, projects: true, transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listVendors() {
  return prisma.vendor.findMany({
    include: {
      _count: {
        select: { vendorBills: true, transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listPaymentMethods() {
  return prisma.paymentMethod.findMany({
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: "asc" },
  });
}

export async function listTransactionCategories() {
  return prisma.transactionCategory.findMany({
    include: { _count: { select: { transactions: true } } },
    orderBy: [{ transactionType: "asc" }, { name: "asc" }],
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    include: {
      role: true,
      brandAccesses: {
        include: { brand: true },
      },
    },
    orderBy: { name: "asc" },
  });
}