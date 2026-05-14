import "server-only";

import type { Prisma } from "@prisma/client";

import { FINANCE_INTERNAL_USER_EMAILS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { resolveScopedBrandWhere } from "@/lib/services/helpers";

function buildScopedBrandLinkWhere(
  scopedBrandWhere: Prisma.StringFilter | string | undefined,
) {
  return scopedBrandWhere
    ? {
        some: {
          brandId: scopedBrandWhere,
        },
      }
    : undefined;
}

export async function getMasterDataOptions(user: SessionUser) {
  const scopedBrandWhere = resolveScopedBrandWhere(user);
  const scopedBrandLinkWhere = buildScopedBrandLinkWhere(scopedBrandWhere);

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
    where: scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : undefined,
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const vendors = await prisma.vendor.findMany({
    where: scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : undefined,
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : undefined,
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
    },
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

export async function listClients(user: SessionUser) {
  const scopedBrandWhere = resolveScopedBrandWhere(user);
  const scopedBrandLinkWhere = buildScopedBrandLinkWhere(scopedBrandWhere);

  return prisma.client.findMany({
    where: scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : undefined,
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
      _count: {
        select: { invoices: true, projects: true, transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listVendors(user: SessionUser) {
  const scopedBrandWhere = resolveScopedBrandWhere(user);
  const scopedBrandLinkWhere = buildScopedBrandLinkWhere(scopedBrandWhere);

  return prisma.vendor.findMany({
    where: scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : undefined,
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
      _count: {
        select: { vendorBills: true, transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listPaymentMethods(user: SessionUser) {
  const scopedBrandWhere = resolveScopedBrandWhere(user);
  const scopedBrandLinkWhere = buildScopedBrandLinkWhere(scopedBrandWhere);

  return prisma.paymentMethod.findMany({
    where: scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : undefined,
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
      _count: { select: { transactions: true } },
    },
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
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [...FINANCE_INTERNAL_USER_EMAILS],
      },
      status: "ACTIVE",
    },
    include: {
      role: true,
      brandAccesses: {
        include: { brand: true },
      },
    },
    orderBy: { email: "asc" },
  });

  const sortOrder = new Map<string, number>(
    FINANCE_INTERNAL_USER_EMAILS.map((email, index) => [email, index]),
  );

  return users.sort((left, right) => {
    return (
      (sortOrder.get(left.email.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
      (sortOrder.get(right.email.toLowerCase()) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

export async function getLockedClientBrandIds(
  clientId: string,
  scopedBrandWhere?: Prisma.StringFilter | string,
) {
  const brandWhere = scopedBrandWhere ? { brandId: scopedBrandWhere } : undefined;

  const [projectBrands, invoiceBrands, transactionBrands] = await Promise.all([
    prisma.project.findMany({
      where: {
        clientId,
        ...brandWhere,
      },
      select: { brandId: true },
      distinct: ["brandId"],
    }),
    prisma.invoice.findMany({
      where: {
        clientId,
        ...brandWhere,
      },
      select: { brandId: true },
      distinct: ["brandId"],
    }),
    prisma.transaction.findMany({
      where: {
        clientId,
        ...brandWhere,
      },
      select: { brandId: true },
      distinct: ["brandId"],
    }),
  ]);

  return [...new Set([
    ...projectBrands.map((item) => item.brandId),
    ...invoiceBrands.map((item) => item.brandId),
    ...transactionBrands.map((item) => item.brandId),
  ])].sort();
}

export async function getLockedVendorBrandIds(
  vendorId: string,
  scopedBrandWhere?: Prisma.StringFilter | string,
) {
  const brandWhere = scopedBrandWhere ? { brandId: scopedBrandWhere } : undefined;

  const [vendorBillBrands, transactionBrands] = await Promise.all([
    prisma.vendorBill.findMany({
      where: {
        vendorId,
        ...brandWhere,
      },
      select: { brandId: true },
      distinct: ["brandId"],
    }),
    prisma.transaction.findMany({
      where: {
        vendorId,
        ...brandWhere,
      },
      select: { brandId: true },
      distinct: ["brandId"],
    }),
  ]);

  return [...new Set([
    ...vendorBillBrands.map((item) => item.brandId),
    ...transactionBrands.map((item) => item.brandId),
  ])].sort();
}

export async function getLockedPaymentMethodBrandIds(
  paymentMethodId: string,
  scopedBrandWhere?: Prisma.StringFilter | string,
) {
  const brandWhere = scopedBrandWhere ? { brandId: scopedBrandWhere } : undefined;

  const transactionBrands = await prisma.transaction.findMany({
    where: {
      paymentMethodId,
      ...brandWhere,
    },
    select: { brandId: true },
    distinct: ["brandId"],
  });

  return [...new Set(transactionBrands.map((item) => item.brandId))].sort();
}

export async function getClientById(user: SessionUser, id: string) {
  const scopedBrandWhere = resolveScopedBrandWhere(user);
  const scopedBrandLinkWhere = buildScopedBrandLinkWhere(scopedBrandWhere);

  const client = await prisma.client.findFirst({
    where: {
      id,
      ...(scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : {}),
    },
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!client) {
    return null;
  }

  const lockedBrandIds = await getLockedClientBrandIds(id, scopedBrandWhere);

  return {
    ...client,
    lockedBrandIds,
  };
}

export async function getVendorById(user: SessionUser, id: string) {
  const scopedBrandWhere = resolveScopedBrandWhere(user);
  const scopedBrandLinkWhere = buildScopedBrandLinkWhere(scopedBrandWhere);

  const vendor = await prisma.vendor.findFirst({
    where: {
      id,
      ...(scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : {}),
    },
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!vendor) {
    return null;
  }

  const lockedBrandIds = await getLockedVendorBrandIds(id, scopedBrandWhere);

  return {
    ...vendor,
    lockedBrandIds,
  };
}

export async function getPaymentMethodById(user: SessionUser, id: string) {
  const scopedBrandWhere = resolveScopedBrandWhere(user);
  const scopedBrandLinkWhere = buildScopedBrandLinkWhere(scopedBrandWhere);

  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: {
      id,
      ...(scopedBrandLinkWhere ? { brandLinks: scopedBrandLinkWhere } : {}),
    },
    include: {
      brandLinks: {
        include: {
          brand: true,
        },
        orderBy: {
          brand: {
            name: "asc",
          },
        },
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
  });

  if (!paymentMethod) {
    return null;
  }

  const lockedBrandIds = await getLockedPaymentMethodBrandIds(id, scopedBrandWhere);

  return {
    ...paymentMethod,
    lockedBrandIds,
  };
}
