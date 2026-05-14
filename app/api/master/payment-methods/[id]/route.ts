import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canAccessFinanceWorkspace, canManageFinance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import { getLockedPaymentMethodBrandIds } from "@/lib/services/master-data";
import { paymentMethodSchema } from "@/lib/validations/finance";

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
    const parsed = paymentMethodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.flatten().formErrors[0] ?? "Data metode pembayaran belum valid.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const existingPaymentMethod = await prisma.paymentMethod.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existingPaymentMethod) {
      return NextResponse.json({ error: "Metode pembayaran tidak ditemukan." }, { status: 404 });
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
        { error: "Brand metode pembayaran belum valid." },
        { status: 400 },
      );
    }

    const lockedBrandIds = await getLockedPaymentMethodBrandIds(id);
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
          error: `Metode pembayaran masih terhubung histori di brand ${lockedBrands.map((brand) => brand.name).join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const { code, name, type, accountName, accountNo, isCash, notes } = parsed.data;

    const paymentMethod = await prisma.$transaction(async (tx) => {
      const savedPaymentMethod = await tx.paymentMethod.update({
        where: { id },
        data: {
          code: code.trim(),
          name: name.trim(),
          type: type?.trim() || null,
          accountName: accountName?.trim() || null,
          accountNo: accountNo?.trim() || null,
          isCash,
          notes: notes?.trim() || null,
        },
      });

      await tx.brandPaymentMethod.deleteMany({
        where: {
          paymentMethodId: id,
        },
      });

      await tx.brandPaymentMethod.createMany({
        data: normalizedBrandIds.map((brandId) => ({
          brandId,
          paymentMethodId: id,
        })),
      });

      return savedPaymentMethod;
    });

    await logActivity({
      action: "UPDATE",
      entityType: "PaymentMethod",
      entityId: paymentMethod.id,
      description: `${user.name} memperbarui metode pembayaran ${paymentMethod.name}.`,
      userId: user.id,
      metadata: {
        brandIds: normalizedBrandIds,
      },
    });

    return NextResponse.json(paymentMethod);
  } catch (error: unknown) {
    console.error("UPDATE PAYMENT METHOD ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal memperbarui metode pembayaran.",
      },
      { status: 500 },
    );
  }
}
