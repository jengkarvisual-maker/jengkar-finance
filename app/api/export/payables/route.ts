import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { canAccessFinanceWorkspace } from "@/lib/permissions";
import { listVendorBills } from "@/lib/services/finance";

export async function GET(request: Request) {
  const user = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessFinanceWorkspace(user)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const payables = await listVendorBills(user, {
    brandId: searchParams.get("brandId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  const csv = toCsv(
    payables.rows.map((row) => ({
      billNo: row.billNo,
      billDate: row.billDate.toISOString(),
      brand: row.brand.name,
      vendor: row.vendor.name,
      totalAmount: Number(row.totalAmount),
      amountPaid: Number(row.amountPaid),
      outstandingAmount: Number(row.outstandingAmount),
      dueDate: row.dueDate.toISOString(),
      status: row.status,
    })),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payables.csv"',
    },
  });
}
