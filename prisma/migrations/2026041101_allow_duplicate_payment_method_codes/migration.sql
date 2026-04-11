-- DropIndex
DROP INDEX IF EXISTS "PaymentMethod_code_key";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentMethod_code_idx" ON "PaymentMethod"("code");
