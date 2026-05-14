import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { canAccessFinanceWorkspace } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";

function parseDateRange(fromRaw: string | null, toRaw: string | null) {
  if (!fromRaw || !toRaw) {
    return null;
  }

  const fromDate = new Date(`${fromRaw}T00:00:00.000+07:00`);
  const toDate = new Date(`${toRaw}T00:00:00.000+07:00`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return null;
  }

  const toExclusive = new Date(toDate);
  toExclusive.setDate(toExclusive.getDate() + 1);

  return {
    fromDate,
    toDate,
    toExclusive,
    label: `${fromRaw}_${toRaw}`,
  };
}

function csvResponse(filename: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessFinanceWorkspace(user)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (user.role.key !== "OWNER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dataset = searchParams.get("dataset");
  const range = parseDateRange(searchParams.get("from"), searchParams.get("to"));

  if (!range) {
    return NextResponse.json({ message: "Rentang tanggal belum valid." }, { status: 400 });
  }

  if (dataset === "activity-log") {
    const rows = await prisma.activityLog.findMany({
      where: {
        createdAt: {
          gte: range.fromDate,
          lt: range.toExclusive,
        },
      },
      include: {
        user: true,
        brand: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (rows.length === 0) {
      return NextResponse.json({ message: "Tidak ada activity log pada periode ini." }, { status: 404 });
    }

    const csv = toCsv(
      rows.map((row) => ({
        waktu: formatDateTime(row.createdAt),
        aksi: row.action,
        entityType: row.entityType,
        entityId: row.entityId ?? "",
        pengguna: row.user?.name ?? "-",
        email: row.user?.email ?? "-",
        brand: row.brand?.name ?? "-",
        deskripsi: row.description,
      })),
    );

    await prisma.activityLog.create({
      data: {
        action: "EXPORT",
        entityType: "DataMaintenance",
        entityId: `activity-log:${range.label}`,
        description: `${user.name} mengekspor ${rows.length} activity log untuk periode ${formatDate(
          range.fromDate,
        )} - ${formatDate(range.toDate)}.`,
        userId: user.id,
        metadata: {
          target: "ActivityLog",
          count: rows.length,
          fromDate: range.fromDate.toISOString(),
          toDate: range.toDate.toISOString(),
        },
      },
    });

    return csvResponse(`finance-activity-log-${range.label}.csv`, csv);
  }

  if (dataset === "draft-transactions") {
    const rows = await prisma.transaction.findMany({
      where: {
        status: "DRAFT",
        createdAt: {
          gte: range.fromDate,
          lt: range.toExclusive,
        },
      },
      include: {
        brand: true,
        client: true,
        vendor: true,
        project: true,
        enteredBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (rows.length === 0) {
      return NextResponse.json({ message: "Tidak ada transaksi draft pada periode ini." }, { status: 404 });
    }

    const csv = toCsv(
      rows.map((row) => ({
        transactionNo: row.transactionNo,
        transactionDate: formatDate(row.transactionDate),
        brand: row.brand.name,
        type: row.transactionType,
        description: row.description,
        client: row.client?.name ?? "",
        vendor: row.vendor?.name ?? "",
        project: row.project?.name ?? "",
        amountIn: Number(row.amountIn),
        amountOut: Number(row.amountOut),
        status: row.status,
        enteredBy: row.enteredBy.name,
        createdAt: formatDateTime(row.createdAt),
      })),
    );

    await prisma.activityLog.create({
      data: {
        action: "EXPORT",
        entityType: "DataMaintenance",
        entityId: `draft-transaction:${range.label}`,
        description: `${user.name} mengekspor ${rows.length} transaksi draft untuk periode ${formatDate(
          range.fromDate,
        )} - ${formatDate(range.toDate)}.`,
        userId: user.id,
        metadata: {
          target: "TransactionDraft",
          count: rows.length,
          fromDate: range.fromDate.toISOString(),
          toDate: range.toDate.toISOString(),
        },
      },
    });

    return csvResponse(`finance-draft-transactions-${range.label}.csv`, csv);
  }

  if (dataset === "draft-documents") {
    const [invoices, vendorBills] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          status: "DRAFT",
          createdAt: {
            gte: range.fromDate,
            lt: range.toExclusive,
          },
        },
        include: {
          brand: true,
          client: true,
          project: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vendorBill.findMany({
        where: {
          status: "DRAFT",
          createdAt: {
            gte: range.fromDate,
            lt: range.toExclusive,
          },
        },
        include: {
          brand: true,
          vendor: true,
          project: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const total = invoices.length + vendorBills.length;

    if (total === 0) {
      return NextResponse.json({ message: "Tidak ada dokumen draft pada periode ini." }, { status: 404 });
    }

    const csv = toCsv([
      ...invoices.map((row) => ({
        jenis: "Invoice",
        nomor: row.invoiceNo,
        tanggal: formatDate(row.invoiceDate),
        brand: row.brand.name,
        relasi: row.client.name,
        project: row.project?.name ?? "",
        total: Number(row.totalAmount),
        status: row.status,
        createdAt: formatDateTime(row.createdAt),
      })),
      ...vendorBills.map((row) => ({
        jenis: "Vendor Bill",
        nomor: row.billNo,
        tanggal: formatDate(row.billDate),
        brand: row.brand.name,
        relasi: row.vendor.name,
        project: row.project?.name ?? "",
        total: Number(row.totalAmount),
        status: row.status,
        createdAt: formatDateTime(row.createdAt),
      })),
    ]);

    await prisma.activityLog.create({
      data: {
        action: "EXPORT",
        entityType: "DataMaintenance",
        entityId: `draft-document:${range.label}`,
        description: `${user.name} mengekspor ${total} dokumen draft untuk periode ${formatDate(
          range.fromDate,
        )} - ${formatDate(range.toDate)}.`,
        userId: user.id,
        metadata: {
          target: "DraftDocuments",
          count: total,
          invoiceCount: invoices.length,
          vendorBillCount: vendorBills.length,
          fromDate: range.fromDate.toISOString(),
          toDate: range.toDate.toISOString(),
        },
      },
    });

    return csvResponse(`finance-draft-documents-${range.label}.csv`, csv);
  }

  return NextResponse.json({ message: "Dataset maintenance tidak dikenali." }, { status: 400 });
}
