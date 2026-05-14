import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canAccessFinanceWorkspace, canManageFinance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import { getLockedVendorBrandIds } from "@/lib/services/master-data";
import { vendorSchema } from "@/lib/validations/finance";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canAccessFinanceWorkspace(user) || !canManageFinance(user)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = vendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.flatten().formErrors[0] ?? "Data vendor belum valid.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existingVendor) {
      return NextResponse.json({ error: "Vendor tidak ditemukan." }, { status: 404 });
    }

    const normalizedBrandIds = [...new Set(parsed.data.brandIds)];
    const brandCount = await prisma.brand.count({
      where: {
        id: {
          in: normalizedBrandIds,
        },
      },
    });

    if (brandCount !== normalizedBrandIds.length) {
      return NextResponse.json(
        { error: "Brand vendor belum valid." },
        { status: 400 },
      );
    }

    const lockedBrandIds = await getLockedVendorBrandIds(id);
    const removedLockedBrandIds = lockedBrandIds.filter(
      (brandId) => !normalizedBrandIds.includes(brandId),
    );

    if (removedLockedBrandIds.length > 0) {
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

      return NextResponse.json(
        {
          error: `Vendor masih terhubung histori di brand ${lockedBrands.map((brand) => brand.name).join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const { name, email, phone, address, notes } = parsed.data;

    const vendor = await prisma.$transaction(async (tx) => {
      const savedVendor = await tx.vendor.update({
        where: { id },
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      await tx.brandVendor.deleteMany({
        where: {
          vendorId: id,
        },
      });

      await tx.brandVendor.createMany({
        data: normalizedBrandIds.map((brandId) => ({
          brandId,
          vendorId: id,
        })),
      });

      return savedVendor;
    });

    await logActivity({
      action: "UPDATE",
      entityType: "Vendor",
      entityId: vendor.id,
      description: `${user.name} memperbarui vendor ${vendor.name}.`,
      userId: user.id,
      metadata: {
        brandIds: normalizedBrandIds,
      },
    });

    return NextResponse.json(vendor);
  } catch (error: unknown) {
    console.error("UPDATE VENDOR ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal memperbarui vendor.",
      },
      { status: 500 },
    );
  }
}
