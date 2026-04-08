import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { listTransactions } from "@/lib/services/finance";

function getBrandValue(row: { brandId?: string | null } & Record<string, unknown>) {
  if (
    "brand" in row &&
    row.brand &&
    typeof row.brand === "object" &&
    "name" in row.brand &&
    typeof row.brand.name === "string"
  ) {
    return row.brand.name;
  }

  return row.brandId ?? "";
}

export async function GET(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const data = await listTransactions(user, {
    brandId: searchParams.get("brandId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    query: searchParams.get("query") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: 1,
    pageSize: 10000,
  });

  const csv = toCsv(
    data.rows.map((row) => ({
      transactionNo: row.transactionNo,
      transactionDate: row.transactionDate.toISOString(),
      brand: getBrandValue(row),
      type: row.transactionType,
      description: row.description,
      amountIn: Number(row.amountIn),
      amountOut: Number(row.amountOut),
      paymentStatus: row.paymentStatus,
      referenceNo: row.referenceNo ?? "",
    })),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}