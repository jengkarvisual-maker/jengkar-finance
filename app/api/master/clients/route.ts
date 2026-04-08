import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      companyName,
      email,
      phone,
      address,
      notes,
    } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nama client wajib diisi." },
        { status: 400 }
      );
    }

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

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error("CREATE CLIENT ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal menyimpan client." },
      { status: 500 }
    );
  }
}