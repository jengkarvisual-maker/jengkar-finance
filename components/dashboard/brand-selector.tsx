"use client";

import { useRouter } from "next/navigation";

type BrandOption = {
  id: string;
  name: string;
  slug: string;
};

export function BrandSelector({
  brands,
  currentSlug,
}: {
  brands: BrandOption[];
  currentSlug: string;
}) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/dashboard/brands/${event.target.value}`);
  }

  return (
    <select
      value={currentSlug}
      onChange={handleChange}
      className="h-10 rounded-md border border-border bg-white px-3 text-sm"
    >
      {brands.map((brand) => (
        <option key={brand.id} value={brand.slug}>
          {brand.name}
        </option>
      ))}
    </select>
  );
}