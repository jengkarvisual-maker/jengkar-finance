import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canAccessFinanceWorkspace, canManageFinance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import { paymentMethodSchema } from "@/lib/validations/finance";

export async function POST(req: Request) {
  try {
    const user = await getCurrentSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canAccessFinanceWorkspace(user) || !canManageFinance(user)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

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

    const { code, name, type, accountName, accountNo, isCash, notes, brandIds } = parsed.data;
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
        { error: "Brand metode pembayaran belum valid." },
        { status: 400 },
      );
    }

    const paymentMethod = await prisma.$transaction(async (tx) => {
      const savedPaymentMethod = await tx.paymentMethod.create({
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

      await tx.brandPaymentMethod.createMany({
        data: normalizedBrandIds.map((brandId) => ({
          brandId,
          paymentMethodId: savedPaymentMethod.id,
        })),
      });

      return savedPaymentMethod;
    });

    await logActivity({
      action: "CREATE",
      entityType: "PaymentMethod",
      entityId: paymentMethod.id,
      description: `${user.name} menambahkan metode pembayaran ${paymentMethod.name}.`,
      userId: user.id,
      metadata: {
        brandIds: normalizedBrandIds,
      },
    });

    return NextResponse.json(paymentMethod, { status: 201 });
  } catch (error: unknown) {
    console.error("CREATE PAYMENT METHOD ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menyimpan metode pembayaran.",
      },
      { status: 500 },
    );
  }
}
