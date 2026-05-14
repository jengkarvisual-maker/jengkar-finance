"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { hashPassword } from "@/lib/auth/password";
import { requireFinanceWorkspaceUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import {
  getLockedClientBrandIds,
  getLockedPaymentMethodBrandIds,
  getLockedVendorBrandIds,
} from "@/lib/services/master-data";
import {
  accountSchema,
  brandSchema,
  clientSchema,
  paymentMethodSchema,
  transactionCategorySchema,
  userSchema,
  vendorSchema,
  type AccountSchema,
  type BrandSchema,
  type ClientSchema,
  type PaymentMethodSchema,
  type TransactionCategorySchema,
  type UserSchema,
  type VendorSchema,
} from "@/lib/validations/finance";
import { slugify } from "@/lib/utils";

function assertMasterDataAccess(roleKey: string) {
  if (!["OWNER", "ADMIN", "FINANCE_STAFF"].includes(roleKey)) {
    throw new Error("Akses ditolak.");
  }
}

function revalidateMasterPages() {
  [
    "/dashboard",
    "/master/brands",
    "/master/accounts",
    "/master/clients",
    "/master/vendors",
    "/master/payment-methods",
    "/master/categories",
    "/master/users",
  ].forEach((path) => revalidatePath(path));
}

async function assertValidBrandIds(brandIds: string[]) {
  const count = await prisma.brand.count({
    where: {
      id: {
        in: brandIds,
      },
    },
  });

  if (count !== brandIds.length) {
    throw new Error("Brand pilihan belum valid.");
  }
}

async function assertLockedBrandIdsPreserved(
  entityLabel: string,
  normalizedBrandIds: string[],
  lockedBrandIds: string[],
) {
  const removedLockedBrandIds = lockedBrandIds.filter(
    (brandId) => !normalizedBrandIds.includes(brandId),
  );

  if (removedLockedBrandIds.length === 0) {
    return;
  }

  const lockedBrands = await prisma.brand.findMany({
    where: {
      id: {
        in: removedLockedBrandIds,
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  throw new Error(
    `${entityLabel} masih terhubung histori di brand ${lockedBrands.map((brand) => brand.name).join(", ")}.`,
  );
}

export async function upsertBrandAction(
  input: BrandSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
  assertMasterDataAccess(user.role.key);

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data brand belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = {
    ...parsed.data,
    slug: slugify(parsed.data.slug || parsed.data.name),
  };

  const brand = id
    ? await prisma.brand.update({ where: { id }, data })
    : await prisma.brand.create({ data });

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "Brand",
    entityId: brand.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} brand ${brand.name}.`,
    userId: user.id,
    brandId: brand.id,
  });

  revalidateMasterPages();

  return {
    ok: true,
    message: `Brand ${brand.name} berhasil disimpan.`,
    data: { id: brand.id },
  };
}

export async function upsertAccountAction(
  input: AccountSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
  assertMasterDataAccess(user.role.key);

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data akun belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const account = id
    ? await prisma.account.update({ where: { id }, data: parsed.data })
    : await prisma.account.create({ data: parsed.data });

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "Account",
    entityId: account.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} akun ${account.name}.`,
    userId: user.id,
    brandId: account.brandId ?? undefined,
  });

  revalidateMasterPages();
  return { ok: true, message: "Akun berhasil disimpan.", data: { id: account.id } };
}

export async function upsertClientAction(
  input: ClientSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
  assertMasterDataAccess(user.role.key);

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data client belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const normalizedBrandIds = [...new Set(parsed.data.brandIds)];
  await assertValidBrandIds(normalizedBrandIds);
  if (id) {
    const lockedBrandIds = await getLockedClientBrandIds(id);
    await assertLockedBrandIdsPreserved("Client", normalizedBrandIds, lockedBrandIds);
  }
  const clientPayload = {
    name: parsed.data.name,
    companyName: parsed.data.companyName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    address: parsed.data.address,
    notes: parsed.data.notes,
  };

  const client = await prisma.$transaction(async (tx) => {
    const savedClient = id
      ? await tx.client.update({ where: { id }, data: clientPayload })
      : await tx.client.create({ data: clientPayload });

    await tx.brandClient.deleteMany({
      where: { clientId: savedClient.id },
    });

    await tx.brandClient.createMany({
      data: normalizedBrandIds.map((brandId) => ({
        brandId,
        clientId: savedClient.id,
      })),
    });

    return savedClient;
  });

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "Client",
    entityId: client.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} client ${client.name}.`,
    userId: user.id,
  });

  revalidateMasterPages();
  return { ok: true, message: "Client berhasil disimpan.", data: { id: client.id } };
}

export async function upsertVendorAction(
  input: VendorSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
  assertMasterDataAccess(user.role.key);

  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data vendor belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const normalizedBrandIds = [...new Set(parsed.data.brandIds)];
  await assertValidBrandIds(normalizedBrandIds);
  if (id) {
    const lockedBrandIds = await getLockedVendorBrandIds(id);
    await assertLockedBrandIdsPreserved("Vendor", normalizedBrandIds, lockedBrandIds);
  }
  const vendorPayload = {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    address: parsed.data.address,
    notes: parsed.data.notes,
  };

  const vendor = await prisma.$transaction(async (tx) => {
    const savedVendor = id
      ? await tx.vendor.update({ where: { id }, data: vendorPayload })
      : await tx.vendor.create({ data: vendorPayload });

    await tx.brandVendor.deleteMany({
      where: { vendorId: savedVendor.id },
    });

    await tx.brandVendor.createMany({
      data: normalizedBrandIds.map((brandId) => ({
        brandId,
        vendorId: savedVendor.id,
      })),
    });

    return savedVendor;
  });

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "Vendor",
    entityId: vendor.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} vendor ${vendor.name}.`,
    userId: user.id,
  });

  revalidateMasterPages();
  return { ok: true, message: "Vendor berhasil disimpan.", data: { id: vendor.id } };
}

export async function upsertPaymentMethodAction(
  input: PaymentMethodSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
  assertMasterDataAccess(user.role.key);

  const parsed = paymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data metode pembayaran belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const normalizedBrandIds = [...new Set(parsed.data.brandIds)];
  await assertValidBrandIds(normalizedBrandIds);
  if (id) {
    const lockedBrandIds = await getLockedPaymentMethodBrandIds(id);
    await assertLockedBrandIdsPreserved(
      "Metode pembayaran",
      normalizedBrandIds,
      lockedBrandIds,
    );
  }

  const paymentMethodPayload = {
    code: parsed.data.code,
    name: parsed.data.name,
    type: parsed.data.type,
    accountName: parsed.data.accountName,
    accountNo: parsed.data.accountNo,
    isCash: parsed.data.isCash,
    notes: parsed.data.notes,
  };

  const paymentMethod = await prisma.$transaction(async (tx) => {
    const savedPaymentMethod = id
      ? await tx.paymentMethod.update({ where: { id }, data: paymentMethodPayload })
      : await tx.paymentMethod.create({ data: paymentMethodPayload });

    await tx.brandPaymentMethod.deleteMany({
      where: { paymentMethodId: savedPaymentMethod.id },
    });

    await tx.brandPaymentMethod.createMany({
      data: normalizedBrandIds.map((brandId) => ({
        brandId,
        paymentMethodId: savedPaymentMethod.id,
      })),
    });

    return savedPaymentMethod;
  });

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "PaymentMethod",
    entityId: paymentMethod.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} metode pembayaran ${paymentMethod.name}.`,
    userId: user.id,
    metadata: {
      brandIds: normalizedBrandIds,
    },
  });

  revalidateMasterPages();
  return {
    ok: true,
    message: "Metode pembayaran berhasil disimpan.",
    data: { id: paymentMethod.id },
  };
}

export async function upsertTransactionCategoryAction(
  input: TransactionCategorySchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
  assertMasterDataAccess(user.role.key);

  const parsed = transactionCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data kategori transaksi belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const category = id
    ? await prisma.transactionCategory.update({ where: { id }, data: parsed.data })
    : await prisma.transactionCategory.create({ data: parsed.data });

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "TransactionCategory",
    entityId: category.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} kategori ${category.name}.`,
    userId: user.id,
  });

  revalidateMasterPages();
  return { ok: true, message: "Kategori berhasil disimpan.", data: { id: category.id } };
}

export async function upsertUserAction(
  input: UserSchema,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireFinanceWorkspaceUser();
  assertMasterDataAccess(user.role.key);

  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data user belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!id && !parsed.data.password) {
    return {
      ok: false,
      message: "Password wajib diisi untuk user baru.",
    };
  }

  const passwordHash = parsed.data.password
    ? await hashPassword(parsed.data.password)
    : undefined;

  const payload = {
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    roleId: parsed.data.roleId,
    status: parsed.data.status,
    allBrandsAccess: parsed.data.allBrandsAccess,
    ...(passwordHash ? { passwordHash } : {}),
  };

  const savedUser = id
    ? await prisma.user.update({
        where: { id },
        data: payload,
      })
    : await prisma.user.create({
        data: {
          ...payload,
          passwordHash: passwordHash!,
        },
      });

  await prisma.userBrandAccess.deleteMany({
    where: { userId: savedUser.id },
  });

  if (!parsed.data.allBrandsAccess && parsed.data.brandIds.length > 0) {
    await prisma.userBrandAccess.createMany({
      data: parsed.data.brandIds.map((brandId) => ({
        userId: savedUser.id,
        brandId,
        canView: true,
        canManage: parsed.data.status === "ACTIVE",
      })),
    });
  }

  await logActivity({
    action: id ? "UPDATE" : "CREATE",
    entityType: "User",
    entityId: savedUser.id,
    description: `${user.name} ${id ? "memperbarui" : "menambahkan"} user ${savedUser.name}.`,
    userId: user.id,
  });

  revalidateMasterPages();
  return { ok: true, message: "User berhasil disimpan.", data: { id: savedUser.id } };
}
