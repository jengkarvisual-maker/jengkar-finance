import { z } from "zod";

export const brandSchema = z.object({
  code: z.string().min(2).max(16),
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  color: z.string().max(32).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const accountSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  category: z.enum([
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "REVENUE",
    "COST_OF_GOODS_SOLD",
    "EXPENSE",
    "OTHER_INCOME",
    "OTHER_EXPENSE",
  ]),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
  description: z.string().max(500).optional().nullable(),
  brandId: z.string().optional().nullable(),
  isSystem: z.boolean().default(false),
});

export const clientSchema = z.object({
  name: z.string().min(2).max(120),
  companyName: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const vendorSchema = clientSchema.extend({});

export const paymentMethodSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  type: z.string().max(60).optional().nullable(),
  accountName: z.string().max(120).optional().nullable(),
  accountNo: z.string().max(120).optional().nullable(),
  isCash: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
});

export const transactionCategorySchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  transactionType: z.enum([
    "INCOME",
    "EXPENSE",
    "CLIENT_DP",
    "CLIENT_SETTLEMENT",
    "PRODUCTION_COST",
    "EQUIPMENT_PURCHASE",
    "MARKETING",
    "SALARY",
    "TRANSPORT",
    "UTILITY",
    "RENT",
    "OWNER_DRAW",
    "CASH_ADJUSTMENT",
    "VENDOR_PAYMENT",
    "ASSET_DEPRECIATION",
  ]),
  accountCategory: z.enum([
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "REVENUE",
    "COST_OF_GOODS_SOLD",
    "EXPENSE",
    "OTHER_INCOME",
    "OTHER_EXPENSE",
  ]),
  description: z.string().max(500).optional().nullable(),
  isSystem: z.boolean().default(false),
});

export const userSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  roleId: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  allBrandsAccess: z.boolean().default(false),
  password: z.string().min(8).max(120).optional().or(z.literal("")),
  brandIds: z.array(z.string()).default([]),
});

export const transactionSchema = z
  .object({
    transactionDate: z.string().min(1),
    brandId: z.string().min(1, "Brand wajib dipilih."),
    transactionType: z.enum([
      "INCOME",
      "EXPENSE",
      "CLIENT_DP",
      "CLIENT_SETTLEMENT",
      "PRODUCTION_COST",
      "EQUIPMENT_PURCHASE",
      "MARKETING",
      "SALARY",
      "TRANSPORT",
      "UTILITY",
      "RENT",
      "OWNER_DRAW",
      "CASH_ADJUSTMENT",
      "VENDOR_PAYMENT",
      "ASSET_DEPRECIATION",
    ]),
    categoryId: z.string().min(1, "Kategori transaksi wajib dipilih."),
    accountId: z.string().min(1, "Akun wajib dipilih."),
    description: z.string().min(3).max(255),
    clientId: z.string().optional().nullable(),
    vendorId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    paymentMethodId: z.string().optional().nullable(),
    paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).default("PAID"),
    amountIn: z.coerce.number().min(0),
    amountOut: z.coerce.number().min(0),
    referenceNo: z.string().max(120).optional().nullable(),
    invoiceId: z.string().optional().nullable(),
    vendorBillId: z.string().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if ((value.amountIn > 0 && value.amountOut > 0) || (value.amountIn === 0 && value.amountOut === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountIn"],
        message: "Isi salah satu nominal masuk atau nominal keluar saja.",
      });
    }
  });

export const invoiceSchema = z.object({
  invoiceNo: z.string().max(50).optional().nullable(),
  invoiceDate: z.string().min(1),
  brandId: z.string().min(1),
  clientId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  totalAmount: z.coerce.number().positive(),
  downPayment: z.coerce.number().min(0).default(0),
  dueDate: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
});

export const vendorBillSchema = z.object({
  billNo: z.string().max(50).optional().nullable(),
  billDate: z.string().min(1),
  vendorId: z.string().min(1),
  brandId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  description: z.string().min(3).max(255),
  totalAmount: z.coerce.number().positive(),
  dueDate: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
});

export const assetSchema = z.object({
  assetCode: z.string().max(50).optional().nullable(),
  name: z.string().min(2).max(150),
  brandId: z.string().min(1),
  category: z.enum([
    "CAMERA",
    "LENS",
    "LIGHTING",
    "COMPUTER",
    "STUDIO_PROP",
    "WARDROBE",
    "FURNITURE",
    "MAKEUP_EQUIPMENT",
    "OTHER",
  ]),
  purchaseDate: z.string().min(1),
  purchasePrice: z.coerce.number().positive(),
  usefulLifeMonths: z.coerce.number().int().min(1),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "NEEDS_REPAIR", "RETIRED"]),
  notes: z.string().max(500).optional().nullable(),
});

export const projectSchema = z.object({
  projectCode: z.string().max(50).optional().nullable(),
  name: z.string().min(3).max(150),
  brandId: z.string().min(1),
  clientId: z.string().min(1),
  projectDate: z.string().min(1),
  value: z.coerce.number().min(0),
  status: z.enum(["LEAD", "BOOKED", "ONGOING", "DONE", "CANCELLED"]),
  notes: z.string().max(500).optional().nullable(),
});

export const reportFilterSchema = z.object({
  brandId: z.string().optional(),
  projectId: z.string().optional(),
  accountCategory: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  month: z.string().optional(),
  year: z.string().optional(),
  query: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
});

export type BrandSchema = z.infer<typeof brandSchema>;
export type AccountSchema = z.infer<typeof accountSchema>;
export type ClientSchema = z.infer<typeof clientSchema>;
export type VendorSchema = z.infer<typeof vendorSchema>;
export type PaymentMethodSchema = z.infer<typeof paymentMethodSchema>;
export type TransactionCategorySchema = z.infer<typeof transactionCategorySchema>;
export type UserSchema = z.infer<typeof userSchema>;
export type TransactionSchema = z.infer<typeof transactionSchema>;
export type InvoiceSchema = z.infer<typeof invoiceSchema>;
export type VendorBillSchema = z.infer<typeof vendorBillSchema>;
export type AssetSchema = z.infer<typeof assetSchema>;
export type ProjectSchema = z.infer<typeof projectSchema>;
export type ReportFilterSchema = z.infer<typeof reportFilterSchema>;
