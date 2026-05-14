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
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number | "all";
};

export function readFilters(
  params: Record<string, string | string[] | undefined>
): AssetFilters {
  const rawPage = getSingleValue(params.page);
  const rawPageSize = getSingleValue(params.pageSize);
  const page =
    rawPage && !Number.isNaN(Number(rawPage))
      ? Math.max(1, Math.floor(Number(rawPage)))
      : undefined;

  const pageSize: number | "all" | undefined =
    rawPageSize === "all"
      ? "all"
      : rawPageSize && !Number.isNaN(Number(rawPageSize))
        ? Number(rawPageSize)
        : undefined;

  return {
    brandId: getSingleValue(params.brandId),
    projectId: getSingleValue(params.projectId),
    accountCategory:
      getSingleValue(params.accountCategory) ?? getSingleValue(params.category),
    from: getSingleValue(params.from),
    to: getSingleValue(params.to),
    month: getSingleValue(params.month),
    query:
      getSingleValue(params.query) ??
      getSingleValue(params.q) ??
      getSingleValue(params.search),
    status: getSingleValue(params.status),
    page,
    pageSize,
  };
}

export function createSearchParams(
  params: Record<string, string | string[] | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const normalizedValue = Array.isArray(value) ? value[0] : value;

    if (normalizedValue) {
      searchParams.set(key, normalizedValue);
    }
  }

  return searchParams.toString();
}
