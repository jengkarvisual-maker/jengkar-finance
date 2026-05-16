import { readFile } from "node:fs/promises";
import path from "node:path";

import { slugify } from "@/lib/utils";

type BrandIdentity = {
  name?: string | null;
  slug?: string | null;
};

type InvoiceIdentity = {
  invoiceNo?: string | null;
  brand?: BrandIdentity | null;
  client?: {
    name?: string | null;
  } | null;
};

const BRAND_LOGO_MAP: Record<string, string> = {
  "the-photoworks": "/brands/the-photoworks.png",
  "bliss-by-puy": "/brands/bliss-by-puy.png",
  photohomestudio: "/brands/photo-home-studio.png",
  "photo-home-studio": "/brands/photo-home-studio.png",
  "jengkar-media": "/brands/jengkar-media.png",
  "jengkar-visual": "/brands/jengkar-visual.png",
  "waju-attire": "/brands/waju-attire.png",
};

function resolveBrandLogoKey(brand?: BrandIdentity | null) {
  if (!brand) {
    return null;
  }

  if (brand.slug && BRAND_LOGO_MAP[brand.slug]) {
    return brand.slug;
  }

  const derivedKey = slugify(brand.name ?? "");
  return BRAND_LOGO_MAP[derivedKey] ? derivedKey : null;
}

export function getBrandLogoPath(brand?: BrandIdentity | null) {
  const key = resolveBrandLogoKey(brand);
  return key ? BRAND_LOGO_MAP[key] : null;
}

export async function getBrandLogoDataUri(brand?: BrandIdentity | null) {
  const publicPath = getBrandLogoPath(brand);

  if (!publicPath) {
    return null;
  }

  const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));

  try {
    const fileBuffer = await readFile(filePath);
    const extension = path.extname(filePath).slice(1).toLowerCase() || "png";
    const mimeType = extension === "svg" ? "image/svg+xml" : `image/${extension}`;
    return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export function sanitizeFilenamePart(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

export function buildInvoicePdfFilename(invoice: InvoiceIdentity) {
  const invoiceNo = sanitizeFilenamePart(invoice.invoiceNo, "invoice");
  const brandName = sanitizeFilenamePart(invoice.brand?.name, "brand");
  const clientName = sanitizeFilenamePart(invoice.client?.name, "client");

  return `${invoiceNo}_${brandName}_${clientName}.pdf`;
}

export function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
