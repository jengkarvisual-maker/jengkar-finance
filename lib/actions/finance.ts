"use server";

import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { requireUser } from "@/lib/auth/session";
import { canManageBrand } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import {
  recalculateInvoice,
  recalculateProject,
  recalculateVendorBill,
} from "@/lib/services/finance";
import { resolveInvoiceStatus, resolveVendorBillStatus } from "@/lib/services/helpers";
import {
  assetSchema,
  invoiceSchema,
  projectSchema,
  transactionSchema,
  vendorBillSchema,
  type AssetSchema,
  type InvoiceSchema,
  type ProjectSchema,
  type TransactionSchema,
  type VendorBillSchema,
} from "@/lib/validations/finance";
import { serialNumber } from "@/lib/utils";

function normalizeOptional(value?: string | null) {
  return value && value.length > 0 ? value : null;
}

function assertFinanceAccess(roleKey: string) {
  if (!["OWNER", "ADMIN", "FINANCE_STAFF"].includes(roleKey)) {
    throw new Error("Akses ditolak.");
  }
}

function ensureBrandManageAccess(user: Awaited<ReturnType<typeof requireUser>>, brandId: string) {
  if (!canManageBrand(user, brandId)) {
    throw new Error("Kamu tidak punya izin mengubah data brand ini.");
  }
}

async function nextNumber(prefix: "TRX" | "INV" | "BILL" | "AST" | "PRJ") {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);

  const count = await (async () => {
    switch (prefix) {
      case "TRX":
        return prisma.transaction.count({ where: { createdAt: { gte: start, lte: end } } });
      case "INV":
        return prisma.invoice.count({ where: { createdAt: { gte: start, lte: end } } });
      case "BILL":
        return prisma.vendorBill.count({ where: { createdAt: { gte: start, lte: end } } });
      case "AST":
        return prisma.asset.count({ where: { createdAt: { gte: start, lte: end } } });
      case "PRJ":
        return prisma.project.count({ where: { createdAt: { gte: start, lte: end } } });
      default:
        return 0;
    }
  })();

  return serialNumber(prefix, today, count + 1);
}

function revalidateFinancePages() {
  [
    "/dashboard",
    "/transactions",
    "/receivables",
    "/payables",
    "/assets",
    "/projects",
    "/reports/profit-loss",
    "/reports/cash-flow",
    "/reports/transactions",
    "/reports/receivables",
    "/reports/payables",
    "/reports/assets",
  ].forEach((path) => revalidatePath(path));
}

export async function upsertTransactionAction(
  input: TransactionSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  assertFinanceAccess(user.role.key);

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data transaksi belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  ensureBrandManageAccess(user, parsed.data.brandId);

  const [account, category] = await Promise.all([
    prisma.account.findUnique({ where: { id: parsed.data.accountId } }),
    prisma.transactionCategory.findUnique({ where: { id: parsed.data.categoryId } }),
  ]);

  if (!account || !category) {
    return { ok: false, message: "Akun atau kategori transaksi tidak ditemukan." };
  }

  if (account.category !== category.accountCategory) {
    return {
      ok: false,
      message: "Akun wajib sesuai dengan kategori akun yang dipilih.",
    };
  }

  const expenseTypes = [
    "EXPENSE",
    "PRODUCTION_COST",
    "EQUIPMENT_PURCHASE",
    "MARKETING",
    "SALARY",
    "TRANSPORT",
    "UTILITY",
    "RENT",
    "OWNER_DRAW",
    "VENDOR_PAYMENT",
    "ASSET_DEPRECIATION",
  ];

  if (
    expenseTypes.includes(parsed.data.transactionType) &&
    !(parsed.data.amountOut > 0 && parsed.data.amountIn === 0)
  ) {
    return {
      ok: false,
      message: "Jenis transaksi pengeluaran harus mengisi nominal keluar.",
    };
  }

  if (
    !expenseTypes.includes(parsed.data.transactionType) &&
    !(parsed.data.amountIn > 0 && parsed.data.amountOut === 0)
  ) {
    return {
      ok: false,
      message: "Jenis transaksi pemasukan harus mengisi nominal masuk.",
    };
  }

  const previous = id
    ? await prisma.transaction.findUnique({
        where: { id },
        select: { invoiceId: true, vendorBillId: true, projectId: true, brandId: true },
      })
    : null;

  const payload = {
    transactionDate: new Date(parsed.data.transactionDate),
    brandId: parsed.data.brandId,
    transactionType: parsed.data.transactionType,
    categoryId: parsed.data.categoryId,
    accountId: parsed.data.accountId,
    description: parsed.data.description,
    clientId: normalizeOptional(parsed.data.clientId),
    vendorId: normalizeOptional(parsed.data.vendorId),
    projectId: normalizeOptional(parsed.data.projectId),
    paymentMethodId: normalizeOptional(parsed.data.paymentMethodId),
    paymentStatus: parsed.data.paymentStatus,
    amountIn: parsed.data.amountIn,
    amountOut: parsed.data.amountOut,
    referenceNo: normalizeOptional(parsed.data.referenceNo),
    invoiceId: normalizeOptional(parsed.data.invoiceId),
    vendorBillId: normalizeOptional(parsed.data.vendorBillId),
    notes: normalizeOptional(parsed.data.notes),
    updatedById: user.id,
  };

  const transaction = id
    ? await prisma.transaction.update({
        where: { id },
        data: payload,
      })
    : await prisma.transaction.create({
        data: {
          ...payload,
          transactionNo: await nextNumber("TRX"),
          enteredById: user.id,
        },
      });

  const relatedIds = new Set<string>();
  [previous?.invoiceId, transaction.invoiceId].filter(Boolean).forEach((value) => relatedIds.add(value!));
  const relatedBillIds = new Set<string>();
  [previous?.vendorBillId, transaction.vendorBillId]
    .filter(Boolean)
    .forEach((value) => relatedBillIds.add(value!));
  const relatedProjectIds = new Set<string>();
  [previous?.projectId, transaction.projectId].filter(Boolean).forEach((value) => relatedProjectIds.add(value!));

  await Promise.all([
    ...Array.from(relatedIds).map((invoiceId) => recalculateInvoice(invoiceId)),
    ...Array.from(relatedBillIds).map((billId) => recalculateVendorBill(billId)),
    ...Array.from(relatedProjectIds).map((projectId) => recalculateProject(projectId)),
  ]);

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "Transaction",
    entityId: transaction.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} transaksi ${transaction.transactionNo}.`,
    userId: user.id,
    brandId: transaction.brandId,
  });

  revalidateFinancePages();
  revalidatePath(`/transactions/${transaction.id}`);

  return {
    ok: true,
    message: "Transaksi berhasil disimpan.",
    data: { id: transaction.id },
  };
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  assertFinanceAccess(user.role.key);

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          projects: true,
          invoices: true,
          transactions: true,
        },
      },
      projects: {
        select: {
          brandId: true,
        },
        take: 1,
      },
      invoices: {
        select: {
          brandId: true,
        },
        take: 1,
      },
      transactions: {
        select: {
          brandId: true,
        },
        take: 1,
      },
    },
  });

  if (!client) {
    return { ok: false, message: "Client tidak ditemukan." };
  }

  const brandId =
    client.projects[0]?.brandId ||
    client.invoices[0]?.brandId ||
    client.transactions[0]?.brandId ||
    null;

  if (brandId && !canManageBrand(user, brandId)) {
    return { ok: false, message: "Kamu tidak punya izin menghapus client ini." };
  }

  if (
    client._count.projects > 0 ||
    client._count.invoices > 0 ||
    client._count.transactions > 0
  ) {
    return {
      ok: false,
      message:
        "Client tidak bisa dihapus karena sudah terhubung dengan project, invoice, atau transaksi.",
    };
  }

  await prisma.client.delete({
    where: { id },
  });

  await logActivity({
    action: "DELETE",
    entityType: "Client",
    entityId: client.id,
    description: `${user.name} menghapus client ${client.name}.`,
    userId: user.id,
    brandId: brandId ?? undefined,
  });

  revalidatePath("/master/clients");

  return {
    ok: true,
    message: "Client berhasil dihapus.",
  };
}


export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  assertFinanceAccess(user.role.key);

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    select: {
      id: true,
      transactionNo: true,
      brandId: true,
      invoiceId: true,
      vendorBillId: true,
      projectId: true,
    },
  });

  if (!transaction) {
    return { ok: false, message: "Transaksi tidak ditemukan." };
  }

  ensureBrandManageAccess(user, transaction.brandId);

  await prisma.transaction.delete({ where: { id } });

  await Promise.all([
    transaction.invoiceId ? recalculateInvoice(transaction.invoiceId) : Promise.resolve(),
    transaction.vendorBillId
      ? recalculateVendorBill(transaction.vendorBillId)
      : Promise.resolve(),
    transaction.projectId ? recalculateProject(transaction.projectId) : Promise.resolve(),
  ]);

  await logActivity({
    action: "DELETE",
    entityType: "Transaction",
    entityId: transaction.id,
    description: `${user.name} menghapus transaksi ${transaction.transactionNo}.`,
    userId: user.id,
    brandId: transaction.brandId,
  });

  revalidateFinancePages();
  return { ok: true, message: "Transaksi berhasil dihapus." };
}

export async function upsertInvoiceAction(
  input: InvoiceSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  assertFinanceAccess(user.role.key);

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data piutang belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  ensureBrandManageAccess(user, parsed.data.brandId);

  const totalAmount = parsed.data.totalAmount;
  const downPayment = parsed.data.downPayment;
  const amountPaid = downPayment;
  const dueDate = new Date(parsed.data.dueDate);
  const outstandingAmount = Math.max(totalAmount - amountPaid, 0);
  const status = resolveInvoiceStatus(totalAmount, amountPaid, dueDate);
  const existingInvoice = id
    ? await prisma.invoice.findUnique({
        where: { id },
        select: { _count: { select: { transactions: true } } },
      })
    : null;

  const invoice = id
    ? await prisma.invoice.update({
        where: { id },
        data: {
          invoiceDate: new Date(parsed.data.invoiceDate),
          brandId: parsed.data.brandId,
          clientId: parsed.data.clientId,
          projectId: normalizeOptional(parsed.data.projectId),
          totalAmount,
          downPayment,
          amountPaid,
          outstandingAmount,
          dueDate,
          status,
          paidAt: outstandingAmount <= 0 ? new Date() : null,
          notes: normalizeOptional(parsed.data.notes),
        },
      })
    : await prisma.invoice.create({
        data: {
          invoiceNo: normalizeOptional(parsed.data.invoiceNo) ?? (await nextNumber("INV")),
          invoiceDate: new Date(parsed.data.invoiceDate),
          brandId: parsed.data.brandId,
          clientId: parsed.data.clientId,
          projectId: normalizeOptional(parsed.data.projectId),
          totalAmount,
          downPayment,
          amountPaid,
          outstandingAmount,
          dueDate,
          status,
          paidAt: outstandingAmount <= 0 ? new Date() : null,
          notes: normalizeOptional(parsed.data.notes),
        },
      });

  if (existingInvoice && existingInvoice._count.transactions > 0) {
    await recalculateInvoice(invoice.id);
  }

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "Invoice",
    entityId: invoice.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} invoice ${invoice.invoiceNo}.`,
    userId: user.id,
    brandId: invoice.brandId,
  });

  revalidateFinancePages();
  revalidatePath(`/receivables/${invoice.id}`);

  return { ok: true, message: "Invoice berhasil disimpan.", data: { id: invoice.id } };
}

export async function upsertVendorBillAction(
  input: VendorBillSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  assertFinanceAccess(user.role.key);

  const parsed = vendorBillSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data hutang vendor belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  ensureBrandManageAccess(user, parsed.data.brandId);

  const totalAmount = parsed.data.totalAmount;
  const amountPaid = 0;
  const dueDate = new Date(parsed.data.dueDate);
  const outstandingAmount = totalAmount;
  const status = resolveVendorBillStatus(totalAmount, amountPaid, dueDate);
  const existingBill = id
    ? await prisma.vendorBill.findUnique({
        where: { id },
        select: { _count: { select: { transactions: true } } },
      })
    : null;

  const bill = id
    ? await prisma.vendorBill.update({
        where: { id },
        data: {
          billDate: new Date(parsed.data.billDate),
          vendorId: parsed.data.vendorId,
          brandId: parsed.data.brandId,
          projectId: normalizeOptional(parsed.data.projectId),
          description: parsed.data.description,
          totalAmount,
          dueDate,
          notes: normalizeOptional(parsed.data.notes),
          outstandingAmount,
          amountPaid,
          status,
          paidAt: null,
        },
      })
    : await prisma.vendorBill.create({
        data: {
          billNo: normalizeOptional(parsed.data.billNo) ?? (await nextNumber("BILL")),
          billDate: new Date(parsed.data.billDate),
          vendorId: parsed.data.vendorId,
          brandId: parsed.data.brandId,
          projectId: normalizeOptional(parsed.data.projectId),
          description: parsed.data.description,
          totalAmount,
          dueDate,
          notes: normalizeOptional(parsed.data.notes),
          outstandingAmount,
          amountPaid,
          status,
        },
      });

  if (existingBill && existingBill._count.transactions > 0) {
    await recalculateVendorBill(bill.id);
  }

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "VendorBill",
    entityId: bill.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} tagihan ${bill.billNo}.`,
    userId: user.id,
    brandId: bill.brandId,
  });

  revalidateFinancePages();
  revalidatePath(`/payables/${bill.id}`);

  return { ok: true, message: "Tagihan vendor berhasil disimpan.", data: { id: bill.id } };
}

function buildDepreciationSchedule(
  assetId: string,
  purchaseDate: Date,
  purchasePrice: number,
  usefulLifeMonths: number,
) {
  const monthlyDepreciation = Number((purchasePrice / usefulLifeMonths).toFixed(2));

  return Array.from({ length: usefulLifeMonths }).map((_, index) => {
    const periodStart = addMonths(startOfMonth(purchaseDate), index);
    const periodEnd = endOfMonth(periodStart);
    const accumulatedAmount = Number(
      Math.min((index + 1) * monthlyDepreciation, purchasePrice).toFixed(2),
    );

    return {
      assetId,
      periodStart,
      periodEnd,
      amount:
        index === usefulLifeMonths - 1
          ? Number((purchasePrice - monthlyDepreciation * index).toFixed(2))
          : monthlyDepreciation,
      accumulatedAmount,
      bookValueAfter: Number((purchasePrice - accumulatedAmount).toFixed(2)),
      note: `Depresiasi bulan ke-${index + 1}`,
    };
  });
}

export async function upsertAssetAction(
  input: AssetSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  assertFinanceAccess(user.role.key);

  const parsed = assetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data aset belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  ensureBrandManageAccess(user, parsed.data.brandId);

  const purchasePrice = parsed.data.purchasePrice;
  const usefulLifeMonths = parsed.data.usefulLifeMonths;
  const monthlyDepreciation = Number((purchasePrice / usefulLifeMonths).toFixed(2));
  const purchaseDate = new Date(parsed.data.purchaseDate);

  const asset = id
    ? await prisma.asset.update({
        where: { id },
        data: {
          name: parsed.data.name,
          brandId: parsed.data.brandId,
          category: parsed.data.category,
          purchaseDate,
          purchasePrice,
          usefulLifeMonths,
          monthlyDepreciation,
          accumulatedDepreciation: 0,
          bookValue: purchasePrice,
          condition: parsed.data.condition,
          notes: normalizeOptional(parsed.data.notes),
        },
      })
    : await prisma.asset.create({
        data: {
          assetCode: normalizeOptional(parsed.data.assetCode) ?? (await nextNumber("AST")),
          name: parsed.data.name,
          brandId: parsed.data.brandId,
          category: parsed.data.category,
          purchaseDate,
          purchasePrice,
          usefulLifeMonths,
          monthlyDepreciation,
          accumulatedDepreciation: 0,
          bookValue: purchasePrice,
          condition: parsed.data.condition,
          notes: normalizeOptional(parsed.data.notes),
        },
      });

  await prisma.assetDepreciation.deleteMany({
    where: { assetId: asset.id },
  });

  await prisma.assetDepreciation.createMany({
    data: buildDepreciationSchedule(asset.id, purchaseDate, purchasePrice, usefulLifeMonths),
  });

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "Asset",
    entityId: asset.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} aset ${asset.name}.`,
    userId: user.id,
    brandId: asset.brandId,
  });

  revalidateFinancePages();
  revalidatePath(`/assets/${asset.id}`);

  return { ok: true, message: "Aset berhasil disimpan.", data: { id: asset.id } };
}

export async function upsertProjectAction(
  input: ProjectSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  assertFinanceAccess(user.role.key);

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data project belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  ensureBrandManageAccess(user, parsed.data.brandId);

  const project = id
    ? await prisma.project.update({
        where: { id },
        data: {
          name: parsed.data.name,
          brandId: parsed.data.brandId,
          clientId: parsed.data.clientId,
          projectDate: new Date(parsed.data.projectDate),
          totalValue: parsed.data.value,
          status: parsed.data.status,
          notes: normalizeOptional(parsed.data.notes),
        },
      })
    : await prisma.project.create({
        data: {
          projectCode: normalizeOptional(parsed.data.projectCode) ?? (await nextNumber("PRJ")),
          name: parsed.data.name,
          brandId: parsed.data.brandId,
          clientId: parsed.data.clientId,
          projectDate: new Date(parsed.data.projectDate),
          totalValue: parsed.data.value,
          status: parsed.data.status,
          notes: normalizeOptional(parsed.data.notes),
        },
      });

  await recalculateProject(project.id);

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "Project",
    entityId: project.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} project ${project.name}.`,
    userId: user.id,
    brandId: project.brandId,
  });

  revalidateFinancePages();
  revalidatePath(`/projects/${project.id}`);

  return { ok: true, message: "Project berhasil disimpan.", data: { id: project.id } };
}

async function deleteRecord(entity: "Invoice" | "VendorBill" | "Asset" | "Project", id: string) {
  const user = await requireUser();
  assertFinanceAccess(user.role.key);

  switch (entity) {
    case "Invoice": {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { transactions: { select: { id: true } } },
      });

      if (!invoice) {
        return { ok: false, message: "Invoice tidak ditemukan." } satisfies ActionResult;
      }

      ensureBrandManageAccess(user, invoice.brandId);

      if (invoice.transactions.length > 0) {
        return {
          ok: false,
          message: "Invoice tidak bisa dihapus karena sudah terhubung dengan transaksi.",
        } satisfies ActionResult;
      }

      await prisma.invoice.delete({ where: { id } });
      await logActivity({
        action: "DELETE",
        entityType: "Invoice",
        entityId: invoice.id,
        description: `${user.name} menghapus invoice ${invoice.invoiceNo}.`,
        userId: user.id,
        brandId: invoice.brandId,
      });
      break;
    }
    case "VendorBill": {
      const bill = await prisma.vendorBill.findUnique({
        where: { id },
        include: { transactions: { select: { id: true } } },
      });

      if (!bill) {
        return { ok: false, message: "Tagihan vendor tidak ditemukan." } satisfies ActionResult;
      }

      ensureBrandManageAccess(user, bill.brandId);

      if (bill.transactions.length > 0) {
        return {
          ok: false,
          message: "Tagihan vendor tidak bisa dihapus karena sudah terhubung dengan transaksi.",
        } satisfies ActionResult;
      }

      await prisma.vendorBill.delete({ where: { id } });
      await logActivity({
        action: "DELETE",
        entityType: "VendorBill",
        entityId: bill.id,
        description: `${user.name} menghapus tagihan ${bill.billNo}.`,
        userId: user.id,
        brandId: bill.brandId,
      });
      break;
    }
    case "Asset": {
      const asset = await prisma.asset.findUnique({ where: { id } });
      if (!asset) {
        return { ok: false, message: "Aset tidak ditemukan." } satisfies ActionResult;
      }

      ensureBrandManageAccess(user, asset.brandId);
      await prisma.asset.delete({ where: { id } });
      await logActivity({
        action: "DELETE",
        entityType: "Asset",
        entityId: asset.id,
        description: `${user.name} menghapus aset ${asset.name}.`,
        userId: user.id,
        brandId: asset.brandId,
      });
      break;
    }
    case "Project": {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              transactions: true,
              invoices: true,
              vendorBills: true,
            },
          },
        },
      });
      if (!project) {
        return { ok: false, message: "Project tidak ditemukan." } satisfies ActionResult;
      }

      ensureBrandManageAccess(user, project.brandId);
      if (
        project._count.transactions > 0 ||
        project._count.invoices > 0 ||
        project._count.vendorBills > 0
      ) {
        return {
          ok: false,
          message: "Project yang sudah memiliki transaksi atau dokumen keuangan tidak bisa dihapus.",
        } satisfies ActionResult;
      }
      await prisma.project.delete({ where: { id } });
      await logActivity({
        action: "DELETE",
        entityType: "Project",
        entityId: project.id,
        description: `${user.name} menghapus project ${project.name}.`,
        userId: user.id,
        brandId: project.brandId,
      });
      break;
    }
  }

  revalidateFinancePages();
  return { ok: true, message: `${entity} berhasil dihapus.` } satisfies ActionResult;
}

export async function deleteInvoiceAction(id: string) {
  return deleteRecord("Invoice", id);
}

export async function deleteVendorBillAction(id: string) {
  return deleteRecord("VendorBill", id);
}

export async function deleteAssetAction(id: string) {
  return deleteRecord("Asset", id);
}

export async function deleteProjectAction(id: string) {
  return deleteRecord("Project", id);
}
