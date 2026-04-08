"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/actions/types";
import { createSessionToken, setAuthCookie, clearAuthCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { loginSchema, type LoginSchema } from "@/lib/validations/auth";

export async function loginAction(
  input: LoginSchema,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Form login belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { role: true },
  });

  if (!user || user.status !== "ACTIVE") {
    return {
      ok: false,
      message: "Email belum terdaftar atau akun sedang nonaktif.",
    };
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isValid) {
    return {
      ok: false,
      message: "Password yang kamu masukkan belum sesuai.",
    };
  }

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role.key,
  });

  await Promise.all([
    setAuthCookie(token),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        description: `${user.name} login ke sistem.`,
        userId: user.id,
      },
    }),
  ]);

  return {
    ok: true,
    message: "Login berhasil.",
    data: { redirectTo: "/dashboard" },
  };
}

export async function logoutAction() {
  await clearAuthCookie();
  redirect("/login");
}
