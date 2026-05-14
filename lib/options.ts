export type SelectOption = {
  value: string;
  label: string;
  brandId?: string;
  brandIds?: string[];
  referenceNo?: string;
};

export function toOptions<T>(
  items: T[] = [],
  value: (item: T) => string,
  label: (item: T) => string,
) {
  return items.map((item) => ({
    value: value(item),
    label: label(item),
  }));
}

export function toMetaOptions<T>(
  items: T[] = [],
  value: (item: T) => string,
  label: (item: T) => string,
  meta: (item: T) => Omit<SelectOption, "value" | "label">,
): SelectOption[] {
  return items.map((item) => ({
    value: value(item),
    label: label(item),
    ...meta(item),
  }));
}

export function toDateInputValue(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
