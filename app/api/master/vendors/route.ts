import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canAccessFinanceWorkspace, canManageFinance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import { vendorSchema } from "@/lib/validations/finance";

export async function POST(req: Request) {
  try {
    const user = await getCurrentSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canAccessFinanceWorkspace(user)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!canManageFinance(user)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

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

    const { name, email, phone, address, notes, brandIds } = parsed.data;
    const normalizedBrandIds = [...new Set(brandIds)];
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

    const vendor = await prisma.$transaction(async (tx) => {
      const savedVendor = await tx.vendor.create({
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          notes: notes?.trim() || null,
        },
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
      action: "CREATE",
      entityType: "Vendor",
      entityId: vendor.id,
      description: `${user.name} menambahkan vendor ${vendor.name}.`,
      userId: user.id,
      metadata: {
        brandIds: normalizedBrandIds,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: unknown) {
    console.error("CREATE VENDOR ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menyimpan vendor.",
      },
      { status: 500 },
    );
  }
}
