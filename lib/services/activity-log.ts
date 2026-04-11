import "server-only";

import { Prisma, type ActivityAction } from "@prisma/client";

import type { SessionUser } from "@/lib/permissions";
import { getAllowedBrandIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type LogActivityInput = {
  action: ActivityAction;
  entityType: string;
  entityId: string;
  description: string;
  userId: string;
  brandId?: string | null;
  metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

export async function logActivity(input: LogActivityInput) {
  await prisma.activityLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      userId: input.userId,
      brandId: input.brandId ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
    },
  });
}

export async function listRecentActivities(user: SessionUser, limit = 8) {
  const allowedBrandIds = getAllowedBrandIds(user);
  const activityScope = allowedBrandIds
    ? {
        OR: [{ brandId: null }, { brandId: { in: allowedBrandIds } }],
      }
    : {};
  const ownerOnlyAuditScope =
    user.role.key === "OWNER" ? {} : { entityType: { not: "OwnerLogin" as const } };

  return prisma.activityLog.findMany({
    take: limit,
    where: {
      AND: [activityScope, ownerOnlyAuditScope],
    },
    include: {
      user: true,
      brand: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
