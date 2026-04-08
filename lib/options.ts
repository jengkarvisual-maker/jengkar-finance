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

export function toDateInputValue(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
