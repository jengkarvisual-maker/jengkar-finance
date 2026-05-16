import type { Prisma } from "@prisma/client";

import { decimalToNumber } from "@/lib/services/helpers";

type MoneyLike = Prisma.Decimal | number | string | null | undefined;

type InvoiceAdditionalItemAmountLike = {
  quantity?: MoneyLike;
  unitPrice?: MoneyLike;
  totalAmount?: MoneyLike;
};

type InvoiceAmountLike = {
  totalAmount?: MoneyLike;
  amountPaid?: MoneyLike;
  additionalItems?: InvoiceAdditionalItemAmountLike[] | null;
};

export function calculateInvoiceAdditionalTotal(
  items?: InvoiceAdditionalItemAmountLike[] | null,
) {
  return (items ?? []).reduce((sum, item) => {
    const storedTotal = decimalToNumber(item.totalAmount);

    if (storedTotal > 0) {
      return sum + storedTotal;
    }

    return (
      sum +
      decimalToNumber(item.quantity) * decimalToNumber(item.unitPrice)
    );
  }, 0);
}

export function calculateInvoiceGrandTotal(invoice: InvoiceAmountLike) {
  return (
    decimalToNumber(invoice.totalAmount) +
    calculateInvoiceAdditionalTotal(invoice.additionalItems)
  );
}

export function calculateInvoiceOutstandingDisplay(invoice: InvoiceAmountLike) {
  return Math.max(
    calculateInvoiceGrandTotal(invoice) - decimalToNumber(invoice.amountPaid),
    0,
  );
}

export function getInvoiceDisplayAmounts(invoice: InvoiceAmountLike) {
  const baseTotal = decimalToNumber(invoice.totalAmount);
  const additionalTotal = calculateInvoiceAdditionalTotal(invoice.additionalItems);
  const amountPaid = decimalToNumber(invoice.amountPaid);
  const grandTotal = baseTotal + additionalTotal;
  const outstandingDisplay = Math.max(grandTotal - amountPaid, 0);

  return {
    baseTotal,
    additionalTotal,
    grandTotal,
    amountPaid,
    outstandingDisplay,
  };
}
