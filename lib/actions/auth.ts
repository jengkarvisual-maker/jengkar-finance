"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/actions/types";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setAuthCookie, clearAuthCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/services/activity-log";
import {
  changePasswordSchema,
  loginSchema,
  resetUserPasswordSchema,
  type ChangePasswordSchema,
  type LoginSchema,
  type ResetUserPasswordSchema,
} from "@/lib/validations/auth";
import { requireAdminOrOwner } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";

async function buildOwnerLoginMetadata() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip");

  return {
    ipAddress,
    userAgent: requestHeaders.get("user-agent"),
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    host: requestHeaders.get("host"),
    origin: requestHeaders.get("origin"),
    referer: requestHeaders.get("referer"),
    loginAt: new Date().toISOString(),
  };
}

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

  const ownerLoginAudit =
    user.role.key === "OWNER" ? await buildOwnerLoginMetadata() : undefined;

  await Promise.all([
    setAuthCookie(token),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    user.role.key === "OWNER"
      ? logActivity({
          action: "LOGIN",
          entityType: "OwnerLogin",
          entityId: user.id,
          description: `${user.name} login ke sistem menggunakan akun owner.`,
          userId: user.id,
          metadata: ownerLoginAudit,
        })
      : Promise.resolve(),
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

export async function changePasswordAction(
  input: ChangePasswordSchema,
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Form ubah password belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      message: "User tidak ditemukan.",
    };
  }

  const matches = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!matches) {
    return {
      ok: false,
      message: "Password saat ini belum sesuai.",
      fieldErrors: {
        currentPassword: ["Password saat ini belum sesuai."],
      },
    };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
    },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "UserPassword",
    entityId: user.id,
    description: `${user.name} mengganti password akunnya sendiri.`,
    userId: user.id,
  });

  revalidatePath("/account/security");

  return {
    ok: true,
    message: "Password berhasil diperbarui.",
  };
}

function canResetTarget(actorRole: string, targetRole: string) {
  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return ["FINANCE_STAFF", "TEAM_MEMBER"].includes(targetRole);
  }

  return false;
}

export async function resetUserPasswordAction(
  input: ResetUserPasswordSchema,
): Promise<ActionResult> {
  const actor = await requireAdminOrOwner();
  const parsed = resetUserPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Form reset password belum valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (parsed.data.userId === actor.id) {
    return {
      ok: false,
      message: "Gunakan form ubah password akun saya untuk akun sendiri.",
      fieldErrors: {
        userId: ["Pilih user lain. Akun sendiri memakai form ubah password."],
      },
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    include: {
      role: true,
    },
  });

  if (!targetUser) {
    return {
      ok: false,
      message: "User tujuan tidak ditemukan.",
    };
  }

  if (!canResetTarget(actor.role.key, targetUser.role.key)) {
    return {
      ok: false,
      message:
        actor.role.key === "ADMIN"
          ? "Admin hanya bisa mereset password user finance staff."
          : "Kamu tidak punya izin untuk mereset password user ini.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      passwordHash,
    },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "UserPassword",
    entityId: targetUser.id,
    description: `${actor.name} mereset password user ${targetUser.name}.`,
    userId: actor.id,
  });

  revalidatePath("/account/security");
  revalidatePath("/master/users");

  return {
    ok: true,
    message: `Password ${targetUser.name} berhasil direset.`,
  };
}
