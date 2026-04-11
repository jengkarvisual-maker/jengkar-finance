import type { Brand, RoleKey, User } from "@prisma/client";

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

export function canManageFinance(user: SessionUser | null | undefined) {
  return Boolean(user && ["OWNER", "ADMIN", "FINANCE_STAFF"].includes(user.role.key));
}

export function getAllowedBrandIds(user: SessionUser | null | undefined) {
  if (!user) {
    return [];
  }

  if (user.allBrandsAccess) {
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

  if (user.allBrandsAccess) {
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

  if (user.allBrandsAccess) {
    return true;
  }

  return user.brandAccesses.some(
    (access) => access.brandId === brandId && access.canManage,
  );
}
