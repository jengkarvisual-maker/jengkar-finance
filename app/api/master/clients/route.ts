import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canAccessFinanceWorkspace, canManageFinance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import { clientSchema } from "@/lib/validations/finance";

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
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.flatten().formErrors[0] ?? "Data client belum valid.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, companyName, email, phone, address, notes, brandIds } = parsed.data;
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
        { error: "Brand client belum valid." },
        { status: 400 },
      );
    }

    const client = await prisma.$transaction(async (tx) => {
      const savedClient = await tx.client.create({
        data: {
          name: name.trim(),
          companyName: companyName?.trim() || null,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          notes: notes?.trim() || null,
        },
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
      action: "CREATE",
      entityType: "Client",
      entityId: client.id,
      description: `${user.name} menambahkan client ${client.name}.`,
      userId: user.id,
      metadata: {
        brandIds: normalizedBrandIds,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: unknown) {
    console.error("CREATE CLIENT ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menyimpan client.",
      },
      { status: 500 },
    );
  }
}
