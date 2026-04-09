import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";

import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";

const SESSION_COOKIE = "rjf_session";
const encoder = new TextEncoder();

type SessionPayload = {
  sub: string;
  email: string;
  role: string;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is required.");
  }

  return encoder.encode(secret);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  const verified = await jwtVerify(token, getSessionSecret());
  return verified.payload as SessionPayload;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: true,
        brandAccesses: {
          include: {
            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
                code: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    return user as SessionUser;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}