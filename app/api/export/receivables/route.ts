import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { getInvoiceDisplayAmounts } from "@/lib/invoice-additional-items";
import { canAccessFinanceWorkspace } from "@/lib/permissions";
import { listInvoices } from "@/lib/services/finance";

function getSearchParamValue(
  searchParams: URLSearchParams,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = searchParams.get(key);

    if (value) {
      return value;
    }
  }

  return undefined;
}

export async function GET(request: Request) {
  const user = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessFinanceWorkspace(user)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const receivables = await listInvoices(user, {
    brandId: searchParams.get("brandId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    query: getSearchParamValue(searchParams, "query", "q", "search"),
    pageSize: 10000,
  });

  const csv = toCsv(
    receivables.rows.map((row) => {
      const displayAmounts = getInvoiceDisplayAmounts(row);

      return {
        invoiceNo: row.invoiceNo,
        invoiceDate: row.invoiceDate.toISOString(),
        brand: row.brand.name,
        client: row.client.name,
        baseTotal: displayAmounts.baseTotal,
        additionalTotal: displayAmounts.additionalTotal,
        grandTotal: displayAmounts.grandTotal,
        amountPaid: displayAmounts.amountPaid,
        outstandingDisplay: displayAmounts.outstandingDisplay,
        dueDate: row.dueDate.toISOString(),
        status: row.status,
      };
    }),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="receivables.csv"',
    },
  });
}
