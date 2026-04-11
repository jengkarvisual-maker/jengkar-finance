import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const user = await getCurrentSession();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  return NextResponse.json({
    ok: true,
    route: "invoice pdf static",
    id,
  });
}
