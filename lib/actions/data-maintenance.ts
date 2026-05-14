"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";

export type MaintenancePreview = {
  count: number;
  summary: string;
};

export type MaintenanceActionState = {
  error: string | null;
  success: string | null;
  preview: MaintenancePreview | null;
};

type MaintenanceRange = {
  fromDate: Date;
  toDate: Date;
  toExclusive: Date;
};

type MaintenanceRangeResult =
  | {
      ok: true;
      value: MaintenanceRange;
    }
  | {
      ok: false;
      state: MaintenanceActionState;
    };

function parseDateRange(formData: FormData): MaintenanceRangeResult {
  const fromRaw = String(formData.get("fromDate") ?? "").trim();
  const toRaw = String(formData.get("toDate") ?? "").trim();

  if (!fromRaw || !toRaw) {
    return {
      ok: false,
      state: {
        error: "Tanggal mulai dan tanggal akhir wajib diisi.",
        success: null,
        preview: null,
      },
    };
  }

  const fromDate = new Date(`${fromRaw}T00:00:00.000+07:00`);
  const toDate = new Date(`${toRaw}T00:00:00.000+07:00`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return {
      ok: false,
      state: {
        error: "Rentang tanggal belum valid.",
        success: null,
        preview: null,
      },
    };
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return {
      ok: false,
      state: {
        error: "Tanggal mulai tidak boleh melewati tanggal akhir.",
        success: null,
        preview: null,
      },
    };
  }

  const toExclusive = new Date(toDate);
  toExclusive.setDate(toExclusive.getDate() + 1);

  return {
    ok: true,
    value: {
      fromDate,
      toDate,
      toExclusive,
    },
  };
}

async function requireOwnerAccess() {
  const user = await requireFinanceWorkspaceUser();

  if (user.role.key !== "OWNER") {
    return {
      error: "Hanya Owner yang dapat menjalankan maintenance data.",
      success: null,
      preview: null,
    } satisfies MaintenanceActionState;
  }

  return user;
}

function ensureDeleteConfirmation(formData: FormData) {
  const confirmationText = String(formData.get("confirmationText") ?? "").trim().toUpperCase();

  if (confirmationText !== "HAPUS") {
    return {
      error: 'Ketik "HAPUS" untuk mengonfirmasi pembersihan data.',
      success: null,
      preview: null,
    } satisfies MaintenanceActionState;
  }

  return null;
}

export async function activityLogMaintenanceAction(
  _previousState: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const owner = await requireOwnerAccess();

  if ("error" in owner) {
    return owner;
  }

  const range = parseDateRange(formData);

  if (!range.ok) {
    return range.state;
  }

  const intent = String(formData.get("intent") ?? "preview");
  const where = {
    createdAt: {
      gte: range.value.fromDate,
      lt: range.value.toExclusive,
    },
  } as const;

  const count = await prisma.activityLog.count({ where });
  const summary = `${count} activity log pada ${formatDate(range.value.fromDate)} - ${formatDate(range.value.toDate)}.`;

  if (intent !== "delete") {
    return {
      error: null,
      success: null,
      preview: {
        count,
        summary,
      },
    };
  }

  const confirmationError = ensureDeleteConfirmation(formData);

  if (confirmationError) {
    return confirmationError;
  }

  const result = await prisma.activityLog.deleteMany({ where });

  await prisma.activityLog.create({
    data: {
      action: "DELETE",
      entityType: "DataMaintenance",
      description: `${owner.name} membersihkan ${result.count} activity log untuk periode ${fromRawLabel(
        range.value.fromDate,
      )} - ${fromRawLabel(range.value.toDate)}.`,
      userId: owner.id,
      metadata: {
        target: "ActivityLog",
        count: result.count,
        fromDate: range.value.fromDate.toISOString(),
        toDate: range.value.toDate.toISOString(),
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/account/security");

  return {
    error: null,
    success: `${result.count} activity log berhasil dihapus untuk periode ${formatDate(range.value.fromDate)} - ${formatDate(range.value.toDate)}.`,
    preview: {
      count,
      summary,
    },
  };
}

export async function draftTransactionMaintenanceAction(
  _previousState: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const owner = await requireOwnerAccess();

  if ("error" in owner) {
    return owner;
  }

  const range = parseDateRange(formData);

  if (!range.ok) {
    return range.state;
  }

  const intent = String(formData.get("intent") ?? "preview");
  const where = {
    status: "DRAFT" as const,
    createdAt: {
      gte: range.value.fromDate,
      lt: range.value.toExclusive,
    },
  };

  const count = await prisma.transaction.count({ where });
  const summary = `${count} transaksi draft pada ${formatDate(range.value.fromDate)} - ${formatDate(range.value.toDate)}. Pembersihan transaksi draft dinonaktifkan agar tidak mempengaruhi data finance yang sudah diinput.`;

  if (intent !== "delete") {
    return {
      error: null,
      success: null,
      preview: {
        count,
        summary,
      },
    };
  }

  return {
    error: "Pembersihan transaksi draft sudah dinonaktifkan supaya data finance yang sudah diinput tidak ikut terhapus.",
    success: null,
    preview: {
      count,
      summary,
    },
  };
}

export async function draftDocumentMaintenanceAction(
  _previousState: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const owner = await requireOwnerAccess();

  if ("error" in owner) {
    return owner;
  }

  const range = parseDateRange(formData);

  if (!range.ok) {
    return range.state;
  }

  const intent = String(formData.get("intent") ?? "preview");
  const invoiceWhere = {
    status: "DRAFT" as const,
    createdAt: {
      gte: range.value.fromDate,
      lt: range.value.toExclusive,
    },
  };
  const vendorBillWhere = {
    status: "DRAFT" as const,
    createdAt: {
      gte: range.value.fromDate,
      lt: range.value.toExclusive,
    },
  };

  const [invoiceCount, vendorBillCount] = await Promise.all([
    prisma.invoice.count({ where: invoiceWhere }),
    prisma.vendorBill.count({ where: vendorBillWhere }),
  ]);

  const totalCount = invoiceCount + vendorBillCount;
  const summary = `${totalCount} dokumen draft pada ${formatDate(range.value.fromDate)} - ${formatDate(range.value.toDate)} (${invoiceCount} invoice, ${vendorBillCount} tagihan vendor). Pembersihan dokumen draft dinonaktifkan agar tidak mempengaruhi data finance yang sudah diinput.`;

  if (intent !== "delete") {
    return {
      error: null,
      success: null,
      preview: {
        count: totalCount,
        summary,
      },
    };
  }

  return {
    error: "Pembersihan dokumen draft sudah dinonaktifkan supaya invoice dan tagihan vendor yang sudah diinput tidak ikut terhapus.",
    success: null,
    preview: {
      count: totalCount,
      summary,
    },
  };
}

function fromRawLabel(date: Date) {
  return formatDate(date);
}
