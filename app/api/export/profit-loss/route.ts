import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { getProfitLossReport } from "@/lib/services/finance";

export async function GET(request: Request) {
  const user = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const report = await getProfitLossReport(user, {
    brandId: searchParams.get("brandId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const csv = toCsv(
    report.rows.map((row) => ({
      brand: row.brandName,
      revenue: row.revenue,
      cogs: row.cogs,
      grossProfit: row.grossProfit,
      expense: row.expense,
      otherIncome: row.otherIncome,
      otherExpense: row.otherExpense,
      netProfit: row.netProfit,
    })),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="profit-loss.csv"',
    },
  });
}
