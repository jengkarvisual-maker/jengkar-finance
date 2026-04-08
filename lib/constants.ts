export const APP_NAME = "RUMAH JENGKAR FINANCE";

export const BRANDS = [
  "The Photoworks",
  "Bliss by Puy",
  "PhotoHomeStudio",
  "Jengkar Media",
  "Jengkar Visual",
  "Waju Attire",
] as const;

export const ROLE_OPTIONS = [
  { label: "Owner", value: "OWNER" },
  { label: "Admin", value: "ADMIN" },
  { label: "Finance Staff", value: "FINANCE_STAFF" },
] as const;

export const TRANSACTION_TYPE_OPTIONS = [
  { label: "Pemasukan", value: "INCOME" },
  { label: "Pengeluaran", value: "EXPENSE" },
  { label: "DP Klien", value: "CLIENT_DP" },
  { label: "Pelunasan", value: "CLIENT_SETTLEMENT" },
  { label: "Biaya Produksi", value: "PRODUCTION_COST" },
  { label: "Pembelian Alat", value: "EQUIPMENT_PURCHASE" },
  { label: "Marketing", value: "MARKETING" },
  { label: "Gaji", value: "SALARY" },
  { label: "Transport", value: "TRANSPORT" },
  { label: "Utilitas", value: "UTILITY" },
  { label: "Sewa", value: "RENT" },
  { label: "Prive Owner", value: "OWNER_DRAW" },
  { label: "Penyesuaian Kas", value: "CASH_ADJUSTMENT" },
  { label: "Pembayaran Vendor", value: "VENDOR_PAYMENT" },
  { label: "Penyusutan Aset", value: "ASSET_DEPRECIATION" },
] as const;

export const ACCOUNT_CATEGORY_OPTIONS = [
  { label: "Asset", value: "ASSET" },
  { label: "Liability", value: "LIABILITY" },
  { label: "Equity", value: "EQUITY" },
  { label: "Revenue", value: "REVENUE" },
  { label: "COGS", value: "COST_OF_GOODS_SOLD" },
  { label: "Expense", value: "EXPENSE" },
  { label: "Other Income", value: "OTHER_INCOME" },
  { label: "Other Expense", value: "OTHER_EXPENSE" },
] as const;

export const PAYMENT_STATUS_OPTIONS = [
  { label: "Unpaid", value: "UNPAID" },
  { label: "Partial", value: "PARTIAL" },
  { label: "Paid", value: "PAID" },
] as const;

export const INVOICE_STATUS_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Unpaid", value: "UNPAID" },
  { label: "Partial", value: "PARTIAL" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
] as const;

export const PROJECT_STATUS_OPTIONS = [
  { label: "Lead", value: "LEAD" },
  { label: "Booked", value: "BOOKED" },
  { label: "Ongoing", value: "ONGOING" },
  { label: "Done", value: "DONE" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;

export const ASSET_CATEGORY_OPTIONS = [
  { label: "Kamera", value: "CAMERA" },
  { label: "Lensa", value: "LENS" },
  { label: "Lighting", value: "LIGHTING" },
  { label: "Komputer / Laptop", value: "COMPUTER" },
  { label: "Properti Studio", value: "STUDIO_PROP" },
  { label: "Wardrobe / Attire", value: "WARDROBE" },
  { label: "Furniture", value: "FURNITURE" },
  { label: "Peralatan Makeup", value: "MAKEUP_EQUIPMENT" },
  { label: "Lainnya", value: "OTHER" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-700 border-zinc-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UNPAID: "bg-amber-50 text-amber-700 border-amber-200",
  PARTIAL: "bg-sky-50 text-sky-700 border-sky-200",
  OVERDUE: "bg-rose-50 text-rose-700 border-rose-200",
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  BOOKED: "bg-sky-50 text-sky-700 border-sky-200",
  ONGOING: "bg-amber-50 text-amber-700 border-amber-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};
