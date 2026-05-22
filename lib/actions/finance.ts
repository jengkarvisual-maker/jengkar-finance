"use server";

import { Prisma } from "@prisma/client";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
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
  invoiceAdditionalItemSchema,
  projectSchema,
  transactionSchema,
  type InvoiceAdditionalItemSchema,
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

function ensureBrandManageAccess(
  user: Awaited<ReturnType<typeof requireFinanceWorkspaceUser>>,
  brandId: string,
) {
  if (!canManageBrand(user, brandId)) {
    throw new Error("Kamu tidak punya izin mengubah data brand ini.");
  }
}

async function nextNumber(prefix: "TRX" | "INV" | "BILL" | "AST" | "PRJ") {
  const today = new Date();
  const dateStamp = [
    today.getFullYear(),
    `${today.getMonth() + 1}`.padStart(2, "0"),
    `${today.getDate()}`.padStart(2, "0"),
  ].join("");
  const serialPrefix = `${prefix}-${dateStamp}-`;

  const latestNumber = await (async () => {
    switch (prefix) {
      case "TRX": {
        const row = await prisma.transaction.findFirst({
          where: { transactionNo: { startsWith: serialPrefix } },
          select: { transactionNo: true },
          orderBy: { transactionNo: "desc" },
        });
        return row?.transactionNo ?? null;
      }
      case "INV": {
        const row = await prisma.invoice.findFirst({
          where: { invoiceNo: { startsWith: serialPrefix } },
          select: { invoiceNo: true },
          orderBy: { invoiceNo: "desc" },
        });
        return row?.invoiceNo ?? null;
      }
      case "BILL": {
        const row = await prisma.vendorBill.findFirst({
          where: { billNo: { startsWith: serialPrefix } },
          select: { billNo: true },
          orderBy: { billNo: "desc" },
        });
        return row?.billNo ?? null;
      }
      case "AST": {
        const row = await prisma.asset.findFirst({
          where: { assetCode: { startsWith: serialPrefix } },
          select: { assetCode: true },
          orderBy: { assetCode: "desc" },
        });
        return row?.assetCode ?? null;
      }
      case "PRJ": {
        const row = await prisma.project.findFirst({
          where: { projectCode: { startsWith: serialPrefix } },
          select: { projectCode: true },
          orderBy: { projectCode: "desc" },
        });
        return row?.projectCode ?? null;
      }
      default:
        return null;
    }
  })();

  const latestSequence = latestNumber
    ? Number(latestNumber.split("-").at(-1) ?? "0")
    : 0;

  return serialNumber(prefix, today, latestSequence + 1);
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

function revalidateInvoiceDetailPages(invoiceId: string) {
  revalidatePath(`/receivables/${invoiceId}`);
  revalidatePath(`/receivables/${invoiceId}/edit`);
  revalidatePath(`/receivables/${invoiceId}/print`);
}

export async function upsertTransactionAction(
  input: TransactionSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
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

  const normalizedInvoiceId = normalizeOptional(parsed.data.invoiceId);
  const normalizedProjectId = normalizeOptional(parsed.data.projectId);
  const normalizedVendorBillId = normalizeOptional(parsed.data.vendorBillId);
  const normalizedClientId = normalizeOptional(parsed.data.clientId);
  const normalizedVendorId = normalizeOptional(parsed.data.vendorId);

  const [account, category, invoice, project, vendorBill, clientBrandLink, vendorBrandLink, paymentMethodBrandLink] = await Promise.all([
    prisma.account.findUnique({ where: { id: parsed.data.accountId } }),
    prisma.transactionCategory.findUnique({ where: { id: parsed.data.categoryId } }),
    normalizedInvoiceId
      ? prisma.invoice.findUnique({
          where: { id: normalizedInvoiceId },
          select: { id: true, invoiceNo: true, brandId: true, clientId: true, projectId: true },
        })
      : Promise.resolve(null),
    normalizedProjectId
      ? prisma.project.findUnique({
          where: { id: normalizedProjectId },
          select: { id: true, brandId: true, clientId: true },
        })
      : Promise.resolve(null),
    normalizedVendorBillId
      ? prisma.vendorBill.findUnique({
          where: { id: normalizedVendorBillId },
          select: { id: true, billNo: true, brandId: true, vendorId: true, projectId: true },
        })
      : Promise.resolve(null),
    normalizedClientId
      ? prisma.brandClient.findFirst({
          where: {
            clientId: normalizedClientId,
            brandId: parsed.data.brandId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    normalizedVendorId
      ? prisma.brandVendor.findFirst({
          where: {
            vendorId: normalizedVendorId,
            brandId: parsed.data.brandId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    normalizeOptional(parsed.data.paymentMethodId)
      ? prisma.brandPaymentMethod.findFirst({
          where: {
            paymentMethodId: normalizeOptional(parsed.data.paymentMethodId)!,
            brandId: parsed.data.brandId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!account || !category) {
    return { ok: false, message: "Akun atau kategori transaksi tidak ditemukan." };
  }

  if (normalizedInvoiceId && !invoice) {
    return { ok: false, message: "Invoice terkait tidak ditemukan." };
  }

  if (normalizedProjectId && !project) {
    return { ok: false, message: "Project terkait tidak ditemukan." };
  }

  if (normalizedVendorBillId && !vendorBill) {
    return { ok: false, message: "Tagihan vendor terkait tidak ditemukan." };
  }

  if (normalizedInvoiceId && normalizedVendorBillId) {
    return {
      ok: false,
      message: "Satu transaksi hanya boleh ditautkan ke satu dokumen keuangan.",
    };
  }

  if (invoice && invoice.brandId !== parsed.data.brandId) {
    return {
      ok: false,
      message: "Invoice yang dipilih harus berasal dari brand yang sama dengan transaksi.",
    };
  }

  if (project && project.brandId !== parsed.data.brandId) {
    return {
      ok: false,
      message: "Project yang dipilih harus berasal dari brand yang sama dengan transaksi.",
    };
  }

  if (vendorBill && vendorBill.brandId !== parsed.data.brandId) {
    return {
      ok: false,
      message: "Tagihan vendor yang dipilih harus berasal dari brand yang sama dengan transaksi.",
    };
  }

  if (invoice && normalizedClientId && invoice.clientId !== normalizedClientId) {
    return {
      ok: false,
      message: "Klien transaksi harus sama dengan klien pada invoice yang dipilih.",
    };
  }

  if (project && normalizedClientId && project.clientId !== normalizedClientId) {
    return {
      ok: false,
      message: "Klien transaksi harus sama dengan klien pada project yang dipilih.",
    };
  }

  if (vendorBill && normalizedVendorId && vendorBill.vendorId !== normalizedVendorId) {
    return {
      ok: false,
      message: "Vendor transaksi harus sama dengan vendor pada tagihan yang dipilih.",
    };
  }

  if (normalizedClientId && !clientBrandLink) {
    return {
      ok: false,
      message: "Klien yang dipilih belum dihubungkan ke brand transaksi ini.",
    };
  }

  if (normalizedVendorId && !vendorBrandLink) {
    return {
      ok: false,
      message: "Vendor yang dipilih belum dihubungkan ke brand transaksi ini.",
    };
  }

  if (normalizeOptional(parsed.data.paymentMethodId) && !paymentMethodBrandLink) {
    return {
      ok: false,
      message: "Metode pembayaran yang dipilih belum dihubungkan ke brand transaksi ini.",
    };
  }

  if (invoice && project && invoice.projectId && invoice.projectId !== project.id) {
    return {
      ok: false,
      message: "Project transaksi harus sama dengan project yang tertaut pada invoice.",
    };
  }

  if (vendorBill && project && vendorBill.projectId && vendorBill.projectId !== project.id) {
    return {
      ok: false,
      message: "Project transaksi harus sama dengan project yang tertaut pada tagihan vendor.",
    };
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
    clientId: normalizedClientId,
    vendorId: normalizedVendorId,
    projectId: normalizedProjectId,
    paymentMethodId: normalizeOptional(parsed.data.paymentMethodId),
    paymentStatus: parsed.data.paymentStatus,
    amountIn: parsed.data.amountIn,
    amountOut: parsed.data.amountOut,
    referenceNo: invoice ? normalizeOptional(invoice.invoiceNo) : normalizeOptional(parsed.data.referenceNo),
    invoiceId: normalizedInvoiceId,
    vendorBillId: normalizedVendorBillId,
    notes: normalizeOptional(parsed.data.notes),
    updatedById: user.id,
  };

  try {
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          ok: false,
          message:
            "Nomor transaksi bentrok dengan data yang sudah ada. Silakan coba simpan lagi atau muat ulang halaman.",
        };
      }

      if (error.code === "P2003") {
        return {
          ok: false,
          message:
            "Relasi transaksi tidak valid. Pastikan invoice, project, vendor, atau tagihan yang dipilih masih tersedia.",
        };
      }
    }

    console.error("upsertTransactionAction failed", {
      id: id ?? null,
      brandId: parsed.data.brandId,
      transactionType: parsed.data.transactionType,
      invoiceId: normalizedInvoiceId,
      vendorBillId: normalizedVendorBillId,
      projectId: normalizedProjectId,
      error,
    });

    return {
      ok: false,
      message: "Transaksi gagal disimpan. Silakan cek kembali data yang dipilih lalu coba lagi.",
    };
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const user = await requireFinanceWorkspaceUser();
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
  const user = await requireFinanceWorkspaceUser();
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
  const user = await requireFinanceWorkspaceUser();
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

  const normalizedProjectId = normalizeOptional(parsed.data.projectId);
  const totalAmount = parsed.data.totalAmount;
  const dueDate = new Date(parsed.data.dueDate);
  const [project, existingInvoice, clientBrandLink] = await Promise.all([
    normalizedProjectId
      ? prisma.project.findUnique({
          where: { id: normalizedProjectId },
          select: { id: true, brandId: true, clientId: true },
        })
      : Promise.resolve(null),
    id
      ? prisma.invoice.findUnique({
          where: { id },
          select: {
            brandId: true,
            clientId: true,
            projectId: true,
            _count: { select: { transactions: true } },
          },
        })
      : Promise.resolve(null),
    prisma.brandClient.findFirst({
      where: {
        clientId: parsed.data.clientId,
        brandId: parsed.data.brandId,
      },
      select: { id: true },
    }),
  ]);

  if (normalizedProjectId && !project) {
    return { ok: false, message: "Project terkait tidak ditemukan." };
  }

  if (project && project.brandId !== parsed.data.brandId) {
    return {
      ok: false,
      message: "Project yang dipilih harus berasal dari brand yang sama dengan invoice.",
    };
  }

  if (project && project.clientId !== parsed.data.clientId) {
    return {
      ok: false,
      message: "Project yang dipilih harus milik klien yang sama dengan invoice.",
    };
  }

  if (!clientBrandLink) {
    return {
      ok: false,
      message: "Klien yang dipilih belum dihubungkan ke brand invoice ini.",
    };
  }

  if (
    existingInvoice &&
    existingInvoice._count.transactions > 0 &&
    (
      existingInvoice.brandId !== parsed.data.brandId ||
      existingInvoice.clientId !== parsed.data.clientId ||
      (existingInvoice.projectId ?? null) !== (normalizedProjectId ?? null)
    )
  ) {
    return {
      ok: false,
      message:
        "Brand, klien, dan project invoice yang sudah punya transaksi tidak bisa diubah.",
    };
  }

  const downPayment = 0;
  const amountPaid = 0;
  const outstandingAmount = totalAmount;
  const status = resolveInvoiceStatus(totalAmount, amountPaid, dueDate);

  const invoice = id
    ? await prisma.invoice.update({
        where: { id },
        data: {
          invoiceDate: new Date(parsed.data.invoiceDate),
          brandId: parsed.data.brandId,
          clientId: parsed.data.clientId,
          projectId: normalizedProjectId,
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
          projectId: normalizedProjectId,
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

export async function createInvoiceAdditionalItemAction(
  input: InvoiceAdditionalItemSchema,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
  assertFinanceAccess(user.role.key);

  const parsed = invoiceAdditionalItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data item tambahan belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
    select: {
      id: true,
      brandId: true,
      invoiceNo: true,
    },
  });

  if (!invoice) {
    return { ok: false, message: "Invoice tidak ditemukan." };
  }

  ensureBrandManageAccess(user, invoice.brandId);

  const quantity = Number(parsed.data.quantity.toFixed(2));
  const unitPrice = Number(parsed.data.unitPrice.toFixed(2));
  const totalAmount = Number((quantity * unitPrice).toFixed(2));

  const item = await prisma.invoiceAdditionalItem.create({
    data: {
      invoiceId: invoice.id,
      name: parsed.data.name.trim(),
      description: normalizeOptional(parsed.data.description),
      quantity,
      unitPrice,
      totalAmount,
      notes: normalizeOptional(parsed.data.notes),
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "InvoiceAdditionalItem",
    entityId: item.id,
    description: `${user.name} menambahkan item tambahan pada invoice ${invoice.invoiceNo}.`,
    userId: user.id,
    brandId: invoice.brandId,
    metadata: {
      invoiceId: invoice.id,
      name: item.name,
      quantity,
      unitPrice,
      totalAmount,
    },
  });

  revalidateInvoiceDetailPages(invoice.id);

  return {
    ok: true,
    message: "Item tambahan berhasil disimpan.",
    data: { id: item.id },
  };
}

export async function deleteInvoiceAdditionalItemAction(
  id: string,
): Promise<ActionResult> {
  const user = await requireFinanceWorkspaceUser();
  assertFinanceAccess(user.role.key);

  const item = await prisma.invoiceAdditionalItem.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      invoice: {
        select: {
          id: true,
          invoiceNo: true,
          brandId: true,
        },
      },
    },
  });

  if (!item) {
    return { ok: false, message: "Item tambahan tidak ditemukan." };
  }

  ensureBrandManageAccess(user, item.invoice.brandId);

  await prisma.invoiceAdditionalItem.delete({
    where: { id: item.id },
  });

  await logActivity({
    action: "DELETE",
    entityType: "InvoiceAdditionalItem",
    entityId: item.id,
    description: `${user.name} menghapus item tambahan ${item.name} dari invoice ${item.invoice.invoiceNo}.`,
    userId: user.id,
    brandId: item.invoice.brandId,
    metadata: {
      invoiceId: item.invoice.id,
      name: item.name,
    },
  });

  revalidateInvoiceDetailPages(item.invoice.id);

  return { ok: true, message: "Item tambahan berhasil dihapus." };
}

export async function upsertVendorBillAction(
  input: VendorBillSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
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

  const normalizedProjectId = normalizeOptional(parsed.data.projectId);
  const totalAmount = parsed.data.totalAmount;
  const amountPaid = 0;
  const dueDate = new Date(parsed.data.dueDate);
  const outstandingAmount = totalAmount;
  const status = resolveVendorBillStatus(totalAmount, amountPaid, dueDate);
  const [project, existingBill, vendorBrandLink] = await Promise.all([
    normalizedProjectId
      ? prisma.project.findUnique({
          where: { id: normalizedProjectId },
          select: { id: true, brandId: true },
        })
      : Promise.resolve(null),
    id
      ? prisma.vendorBill.findUnique({
          where: { id },
          select: {
            vendorId: true,
            brandId: true,
            projectId: true,
            _count: { select: { transactions: true } },
          },
        })
      : Promise.resolve(null),
    prisma.brandVendor.findFirst({
      where: {
        vendorId: parsed.data.vendorId,
        brandId: parsed.data.brandId,
      },
      select: { id: true },
    }),
  ]);

  if (normalizedProjectId && !project) {
    return { ok: false, message: "Project terkait tidak ditemukan." };
  }

  if (project && project.brandId !== parsed.data.brandId) {
    return {
      ok: false,
      message: "Project yang dipilih harus berasal dari brand yang sama dengan tagihan vendor.",
    };
  }

  if (!vendorBrandLink) {
    return {
      ok: false,
      message: "Vendor yang dipilih belum dihubungkan ke brand tagihan ini.",
    };
  }

  if (
    existingBill &&
    existingBill._count.transactions > 0 &&
    (
      existingBill.vendorId !== parsed.data.vendorId ||
      existingBill.brandId !== parsed.data.brandId ||
      (existingBill.projectId ?? null) !== (normalizedProjectId ?? null)
    )
  ) {
    return {
      ok: false,
      message:
        "Vendor, brand, dan project tagihan yang sudah punya transaksi tidak bisa diubah.",
    };
  }

  const bill = id
    ? await prisma.vendorBill.update({
        where: { id },
        data: {
          billDate: new Date(parsed.data.billDate),
          vendorId: parsed.data.vendorId,
          brandId: parsed.data.brandId,
          projectId: normalizedProjectId,
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
          projectId: normalizedProjectId,
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
  const user = await requireFinanceWorkspaceUser();
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
  const user = await requireFinanceWorkspaceUser();
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

  const clientBrandLink = await prisma.brandClient.findFirst({
    where: {
      clientId: parsed.data.clientId,
      brandId: parsed.data.brandId,
    },
    select: { id: true },
  });

  if (!clientBrandLink) {
    return {
      ok: false,
      message: "Klien yang dipilih belum dihubungkan ke brand project ini.",
    };
  }

  const project = id
    ? await prisma.project.update({
        where: { id },
        data: {
          name: parsed.data.name,
          brandId: parsed.data.brandId,
          clientId: parsed.data.clientId,
          projectDate: new Date(parsed.data.projectDate),
          value: parsed.data.value,
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
          value: parsed.data.value,
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
  const user = await requireFinanceWorkspaceUser();
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
