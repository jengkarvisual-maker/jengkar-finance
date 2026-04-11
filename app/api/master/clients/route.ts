import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canManageFinance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import { clientSchema } from "@/lib/validations/finance";

export async function POST(req: Request) {
  try {
    const user = await getCurrentSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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

    const { name, companyName, email, phone, address, notes } = parsed.data;

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        companyName: companyName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    await logActivity({
      action: "CREATE",
      entityType: "Client",
      entityId: client.id,
      description: `${user.name} menambahkan client ${client.name}.`,
      userId: user.id,
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
