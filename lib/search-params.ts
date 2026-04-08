function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type AssetFilters = {
  brandId?: string;
  projectId?: string;
  accountCategory?: string;
  from?: string;
  to?: string;
  month?: string;
  pageSize?: number | "all";
};

export function readFilters(
  params: Record<string, string | string[] | undefined>
): AssetFilters {
  const rawPageSize = getSingleValue(params.pageSize);

  const pageSize: number | "all" | undefined =
    rawPageSize === "all"
      ? "all"
      : rawPageSize && !Number.isNaN(Number(rawPageSize))
        ? Number(rawPageSize)
        : undefined;

  return {
    brandId: getSingleValue(params.brandId),
    projectId: getSingleValue(params.projectId),
    accountCategory: getSingleValue(params.accountCategory),
    from: getSingleValue(params.from),
    to: getSingleValue(params.to),
    month: getSingleValue(params.month),
    pageSize,
  };
}