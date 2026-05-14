import type { Brand, RoleKey, User } from "@prisma/client";

import { FINANCE_INTERNAL_USER_EMAILS } from "@/lib/constants";

export type SessionUser = Pick<
  User,
  "id" | "name" | "email" | "allBrandsAccess" | "roleId"
> & {
  role: {
    id: string;
    key: RoleKey;
    name: string;
  };
  brandAccesses: Array<{
    brandId: string;
    canView: boolean;
    canManage: boolean;
    brand: Pick<Brand, "id" | "name" | "slug" | "code" | "color">;
  }>;
};

export function isOwner(user: SessionUser | null | undefined) {
  return user?.role.key === "OWNER";
}

export function isAdmin(user: SessionUser | null | undefined) {
  return user?.role.key === "ADMIN";
}

export function hasAllBrandAccess(user: SessionUser | null | undefined) {
  return Boolean(
    user &&
      (user.allBrandsAccess ||
        ["OWNER", "ADMIN", "FINANCE_STAFF"].includes(user.role.key)),
  );
}

export function canManageFinance(user: SessionUser | null | undefined) {
  return Boolean(user && ["OWNER", "ADMIN", "FINANCE_STAFF"].includes(user.role.key));
}

export function isFinanceInternalUser(
  user: Pick<SessionUser, "email"> | null | undefined,
) {
  if (!user) {
    return false;
  }

  return FINANCE_INTERNAL_USER_EMAILS.includes(
    user.email.toLowerCase() as (typeof FINANCE_INTERNAL_USER_EMAILS)[number],
  );
}

export function getFinanceUserRoleLabel(
  user:
    | (Pick<SessionUser, "email"> & {
        role: {
          key: RoleKey;
          name: string;
        };
      })
    | null
    | undefined,
) {
  if (!user) {
    return "";
  }

  const email = user.email.toLowerCase();

  if (email === "owner@rumahjengkar.com") {
    return "Owner";
  }

  if (email === "finance@rumahjengkar.com") {
    return "Finance";
  }

  if (user.role.key === "ADMIN") {
    return "Admin";
  }

  return user.role.name;
}

export function canAccessFinanceWorkspace(user: SessionUser | null | undefined) {
  return canManageFinance(user) && isFinanceInternalUser(user);
}

export function getAllowedBrandIds(user: SessionUser | null | undefined) {
  if (!user) {
    return [];
  }

  if (hasAllBrandAccess(user)) {
    return undefined;
  }

  return user.brandAccesses
    .filter((access) => access.canView || access.canManage)
    .map((access) => access.brandId);
}

export function canAccessBrand(
  user: SessionUser | null | undefined,
  brandId: string | null | undefined,
) {
  if (!user || !brandId) {
    return false;
  }

  if (hasAllBrandAccess(user)) {
    return true;
  }

  return user.brandAccesses.some(
    (access) => access.brandId === brandId && (access.canView || access.canManage),
  );
}

export function canManageBrand(
  user: SessionUser | null | undefined,
  brandId: string | null | undefined,
) {
  if (!user || !brandId) {
    return false;
  }

  if (hasAllBrandAccess(user)) {
    return true;
  }

  return user.brandAccesses.some(
    (access) => access.brandId === brandId && access.canManage,
  );
}
