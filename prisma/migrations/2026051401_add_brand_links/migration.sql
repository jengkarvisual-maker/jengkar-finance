-- CreateTable
CREATE TABLE "BrandClient" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandVendor" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandPaymentMethod" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandClient_brandId_clientId_key" ON "BrandClient"("brandId", "clientId");

-- CreateIndex
CREATE INDEX "BrandClient_clientId_idx" ON "BrandClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandVendor_brandId_vendorId_key" ON "BrandVendor"("brandId", "vendorId");

-- CreateIndex
CREATE INDEX "BrandVendor_vendorId_idx" ON "BrandVendor"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPaymentMethod_brandId_paymentMethodId_key" ON "BrandPaymentMethod"("brandId", "paymentMethodId");

-- CreateIndex
CREATE INDEX "BrandPaymentMethod_paymentMethodId_idx" ON "BrandPaymentMethod"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "BrandClient" ADD CONSTRAINT "BrandClient_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandClient" ADD CONSTRAINT "BrandClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandVendor" ADD CONSTRAINT "BrandVendor_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandVendor" ADD CONSTRAINT "BrandVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPaymentMethod" ADD CONSTRAINT "BrandPaymentMethod_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPaymentMethod" ADD CONSTRAINT "BrandPaymentMethod_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
