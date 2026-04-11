import "server-only";

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

export function getAppUrl() {
  const candidates = [
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ].filter((value): value is string => Boolean(value?.trim()));

  if (candidates.length > 0) {
    return normalizeUrl(candidates[0]);
  }

  return "http://localhost:3000";
}

export function getDefaultTimezone() {
  return process.env.DEFAULT_TIMEZONE?.trim() || "Asia/Jakarta";
}
