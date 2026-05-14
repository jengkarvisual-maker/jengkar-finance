import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | bigint) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function formatCompactCurrency(value: number | string | bigint) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatMonthLabel(
  month: number,
  year: number,
  locale = "id-ID",
) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,-]/g, "").replace(",", ".");
    return Number(normalized || 0);
  }

  return 0;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateCode(prefix: string, sequence: number) {
  return `${prefix}-${sequence.toString().padStart(4, "0")}`;
}

export function serialNumber(prefix: string, date = new Date(), seq = 1) {
  const stamp = [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, "0"),
    `${date.getDate()}`.padStart(2, "0"),
  ].join("");

  return `${prefix}-${stamp}-${seq.toString().padStart(4, "0")}`;
}

export function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

  return { start, end };
}

export function getPreviousMonthRange(date = new Date()) {
  const target = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return getMonthRange(target);
}

export function sumValues(
  values: Array<number | string | bigint | null | undefined>,
): number {
  return values.reduce<number>((total, value) => {
    return total + Number(value ?? 0);
  }, 0);
}
