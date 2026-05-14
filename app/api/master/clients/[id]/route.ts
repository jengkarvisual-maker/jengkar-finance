import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canAccessFinanceWorkspace, canManageFinance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import { getLockedClientBrandIds } from "@/lib/services/master-data";
import { clientSchema } from "@/lib/validations/finance";

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

    const existingClient = await prisma.client.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client tidak ditemukan." }, { status: 404 });
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
        { error: "Brand client belum valid." },
        { status: 400 },
      );
    }

    const lockedBrandIds = await getLockedClientBrandIds(id);
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
          error: `Client masih terhubung histori di brand ${lockedBrands.map((brand) => brand.name).join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const { name, companyName, email, phone, address, notes } = parsed.data;

    const client = await prisma.$transaction(async (tx) => {
      const savedClient = await tx.client.update({
        where: { id },
        data: {
          name: name.trim(),
          companyName: companyName?.trim() || null,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      await tx.brandClient.deleteMany({
        where: {
          clientId: id,
        },
      });

      await tx.brandClient.createMany({
        data: normalizedBrandIds.map((brandId) => ({
          brandId,
          clientId: id,
        })),
      });

      return savedClient;
    });

    await logActivity({
      action: "UPDATE",
      entityType: "Client",
      entityId: client.id,
      description: `${user.name} memperbarui client ${client.name}.`,
      userId: user.id,
      metadata: {
        brandIds: normalizedBrandIds,
      },
    });

    return NextResponse.json(client);
  } catch (error: unknown) {
    console.error("UPDATE CLIENT ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal memperbarui client.",
      },
      { status: 500 },
    );
  }
}
