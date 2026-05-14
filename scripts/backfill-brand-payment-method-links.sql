INSERT INTO "BrandPaymentMethod" ("id", "brandId", "paymentMethodId", "createdAt")
SELECT
  gen_random_uuid()::text,
  source."brandId",
  source."paymentMethodId",
  NOW()
FROM (
  SELECT DISTINCT
    "brandId",
    "paymentMethodId"
  FROM "Transaction"
  WHERE "paymentMethodId" IS NOT NULL
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM "BrandPaymentMethod" existing
  WHERE existing."brandId" = source."brandId"
    AND existing."paymentMethodId" = source."paymentMethodId"
);
