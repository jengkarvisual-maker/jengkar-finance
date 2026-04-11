import bcrypt from "bcryptjs";
import { PrismaClient, RoleKey } from "@prisma/client";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";

const prisma = new PrismaClient();

function assetSchedule(assetId: string, purchaseDate: Date, purchasePrice: number, usefulLifeMonths: number) {
  const monthly = Number((purchasePrice / usefulLifeMonths).toFixed(2));

  return Array.from({ length: usefulLifeMonths }).map((_, index) => {
    const periodStart = addMonths(startOfMonth(purchaseDate), index);
    const accumulatedAmount = Number(
      Math.min((index + 1) * monthly, purchasePrice).toFixed(2),
    );

    return {
      assetId,
      periodStart,
      periodEnd: endOfMonth(periodStart),
      amount:
        index === usefulLifeMonths - 1
          ? Number((purchasePrice - monthly * index).toFixed(2))
          : monthly,
      accumulatedAmount,
      bookValueAfter: Number((purchasePrice - accumulatedAmount).toFixed(2)),
      note: `Depresiasi bulan ke-${index + 1}`,
    };
  });
}

function invoiceStatus(total: number, paid: number, dueDate: Date) {
  if (paid <= 0) {
    return dueDate < new Date() ? "OVERDUE" : "UNPAID";
  }

  if (paid < total) {
    return dueDate < new Date() ? "OVERDUE" : "PARTIAL";
  }

  return "PAID";
}

function billStatus(total: number, paid: number, dueDate: Date) {
  if (paid <= 0) {
    return dueDate < new Date() ? "OVERDUE" : "UNPAID";
  }

  if (paid < total) {
    return dueDate < new Date() ? "OVERDUE" : "PARTIAL";
  }

  return "PAID";
}

async function main() {
  await prisma.attachment.deleteMany();
  await prisma.assetDepreciation.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.vendorBill.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.project.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.client.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.account.deleteMany();
  await prisma.transactionCategory.deleteMany();
  await prisma.userBrandAccess.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.brand.deleteMany();

  await prisma.role.createMany({
    data: [
      {
        key: RoleKey.OWNER,
        name: "Owner",
        description: "Akses penuh semua brand dan laporan konsolidasi.",
      },
      {
        key: RoleKey.ADMIN,
        name: "Admin",
        description: "Mengelola transaksi harian dan master data operasional.",
      },
      {
        key: RoleKey.FINANCE_STAFF,
        name: "Finance Staff",
        description: "Input transaksi, piutang, hutang, dan laporan terbatas.",
      },
    ],
  });

  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map((role) => [role.key, role.id]));

  await prisma.brand.createMany({
    data: [
      { code: "TPW", name: "The Photoworks", slug: "the-photoworks", color: "#355E3B" },
      { code: "BBP", name: "Bliss by Puy", slug: "bliss-by-puy", color: "#A76A4A" },
      { code: "PHS", name: "PhotoHomeStudio", slug: "photohomestudio", color: "#7F8C57" },
      { code: "JMD", name: "Jengkar Media", slug: "jengkar-media", color: "#3B6C85" },
      { code: "JVS", name: "Jengkar Visual", slug: "jengkar-visual", color: "#685B8C" },
      { code: "WAJ", name: "Waju Attire", slug: "waju-attire", color: "#9B6A5A" },
    ],
  });

  const brands = await prisma.brand.findMany();
  const brandMap = Object.fromEntries(brands.map((brand) => [brand.code, brand]));

  await prisma.transactionCategory.createMany({
    data: [
      { code: "CAT-INCOME", name: "Pemasukan Umum", transactionType: "INCOME", accountCategory: "REVENUE", isSystem: true },
      { code: "CAT-DP", name: "DP Klien", transactionType: "CLIENT_DP", accountCategory: "REVENUE", isSystem: true },
      { code: "CAT-SETTLE", name: "Pelunasan Klien", transactionType: "CLIENT_SETTLEMENT", accountCategory: "REVENUE", isSystem: true },
      { code: "CAT-PROD", name: "Biaya Produksi", transactionType: "PRODUCTION_COST", accountCategory: "COST_OF_GOODS_SOLD", isSystem: true },
      { code: "CAT-EQUIP", name: "Pembelian Alat", transactionType: "EQUIPMENT_PURCHASE", accountCategory: "ASSET", isSystem: true },
      { code: "CAT-MKT", name: "Marketing", transactionType: "MARKETING", accountCategory: "EXPENSE", isSystem: true },
      { code: "CAT-SAL", name: "Gaji", transactionType: "SALARY", accountCategory: "EXPENSE", isSystem: true },
      { code: "CAT-TRN", name: "Transport", transactionType: "TRANSPORT", accountCategory: "EXPENSE", isSystem: true },
      { code: "CAT-UTL", name: "Utilitas", transactionType: "UTILITY", accountCategory: "EXPENSE", isSystem: true },
      { code: "CAT-RENT", name: "Sewa", transactionType: "RENT", accountCategory: "EXPENSE", isSystem: true },
      { code: "CAT-VPAY", name: "Pembayaran Vendor", transactionType: "VENDOR_PAYMENT", accountCategory: "LIABILITY", isSystem: true },
      { code: "CAT-PRIVE", name: "Prive Owner", transactionType: "OWNER_DRAW", accountCategory: "EQUITY", isSystem: true },
    ],
  });

  await prisma.account.createMany({
    data: [
      { code: "1101", name: "Kas", category: "ASSET", normalBalance: "DEBIT", isSystem: true },
      { code: "1102", name: "Bank BCA", category: "ASSET", normalBalance: "DEBIT", isSystem: true },
      { code: "1103", name: "Piutang Usaha", category: "ASSET", normalBalance: "DEBIT", isSystem: true },
      { code: "1201", name: "Peralatan Produksi", category: "ASSET", normalBalance: "DEBIT", isSystem: true },
      { code: "2101", name: "Hutang Vendor", category: "LIABILITY", normalBalance: "CREDIT", isSystem: true },
      { code: "3101", name: "Modal Owner", category: "EQUITY", normalBalance: "CREDIT", isSystem: true },
      { code: "3102", name: "Prive Owner", category: "EQUITY", normalBalance: "DEBIT", isSystem: true },
      { code: "4101", name: "Pendapatan Jasa", category: "REVENUE", normalBalance: "CREDIT", isSystem: true },
      { code: "5101", name: "Biaya Produksi", category: "COST_OF_GOODS_SOLD", normalBalance: "DEBIT", isSystem: true },
      { code: "6101", name: "Biaya Marketing", category: "EXPENSE", normalBalance: "DEBIT", isSystem: true },
      { code: "6102", name: "Biaya Gaji", category: "EXPENSE", normalBalance: "DEBIT", isSystem: true },
      { code: "6103", name: "Biaya Transport", category: "EXPENSE", normalBalance: "DEBIT", isSystem: true },
      { code: "6104", name: "Biaya Utilitas", category: "EXPENSE", normalBalance: "DEBIT", isSystem: true },
      { code: "6105", name: "Biaya Sewa", category: "EXPENSE", normalBalance: "DEBIT", isSystem: true },
    ],
  });

  await prisma.paymentMethod.createMany({
    data: [
      { code: "CASH", name: "Cash", type: "Cash", isCash: true },
      { code: "BCA", name: "Transfer BCA", type: "Bank Transfer", accountName: "Rumah Jengkar", accountNo: "1234567890" },
      { code: "BRI", name: "Transfer BRI PHS", type: "Bank Transfer" },
      { code: "BCA", name: "Transfer BCA Gepy 1231", type: "Bank Transfer" },
      { code: "BCA", name: "Transfer BCA Puy", type: "Bank Transfer" },
      { code: "MANDIRI", name: "Transfer Mandiri", type: "Bank Transfer", accountName: "Rumah Jengkar", accountNo: "0987654321" },
      { code: "QRIS", name: "QRIS", type: "Digital", isCash: false },
    ],
  });

  await prisma.client.createMany({
    data: [
      { name: "Andra & Nisa", phone: "081234567801", notes: "Wedding documentary" },
      { name: "Raka & Caca", phone: "081234567802", notes: "MUA + photo package" },
      { name: "Studio Keluarga Harsa", companyName: "Harsa Family", phone: "081234567803" },
      { name: "PT Harmoni Rasa", companyName: "PT Harmoni Rasa", email: "marketing@harmoni.id" },
      { name: "Wiwin Bridal", companyName: "Wiwin Bridal House", phone: "081234567804" },
      { name: "Dimas & Niken", phone: "081234567805", notes: "Attire + wedding" },
    ],
  });

  await prisma.vendor.createMany({
    data: [
      { name: "CV Sinar Lighting", phone: "021888111" },
      { name: "Vendor Makeup Partner", phone: "08177788111" },
      { name: "Studio Prop Nusantara", phone: "08177788222" },
      { name: "Digital Ads Jogja", email: "ops@digitaladsjogja.id" },
      { name: "Sewa Mobil Event", phone: "08177788333" },
      { name: "Konveksi Wardrobe Prima", phone: "08177788444" },
    ],
  });

  const categories = await prisma.transactionCategory.findMany();
  const categoryMap = Object.fromEntries(categories.map((item) => [item.code, item.id]));
  const accounts = await prisma.account.findMany();
  const accountMap = Object.fromEntries(accounts.map((item) => [item.code, item.id]));
  const paymentMethods = await prisma.paymentMethod.findMany();
  const paymentMethodMap = Object.fromEntries(paymentMethods.map((item) => [item.name, item.id]));
  const clients = await prisma.client.findMany();
  const clientMap = Object.fromEntries(clients.map((item) => [item.name, item.id]));
  const vendors = await prisma.vendor.findMany();
  const vendorMap = Object.fromEntries(vendors.map((item) => [item.name, item.id]));

  const ownerPassword = await bcrypt.hash("Jengkar123!", 12);
  const adminPassword = await bcrypt.hash("Jengkar123!", 12);
  const financePassword = await bcrypt.hash("Jengkar123!", 12);

  const owner = await prisma.user.create({
    data: {
      name: "RJ Owner",
      email: "owner@rumahjengkar.id",
      passwordHash: ownerPassword,
      roleId: roleMap.OWNER,
      allBrandsAccess: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "RJ Admin",
      email: "admin@rumahjengkar.id",
      passwordHash: adminPassword,
      roleId: roleMap.ADMIN,
      allBrandsAccess: true,
    },
  });

  const finance = await prisma.user.create({
    data: {
      name: "RJ Finance",
      email: "finance@rumahjengkar.id",
      passwordHash: financePassword,
      roleId: roleMap.FINANCE_STAFF,
      allBrandsAccess: false,
    },
  });

  await prisma.userBrandAccess.createMany({
    data: [
      { userId: finance.id, brandId: brandMap.TPW.id, canView: true, canManage: true },
      { userId: finance.id, brandId: brandMap.BBP.id, canView: true, canManage: true },
      { userId: finance.id, brandId: brandMap.WAJ.id, canView: true, canManage: true },
    ],
  });

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        projectCode: "PRJ-202601-0001",
        name: "Wedding Andra & Nisa",
        brandId: brandMap.TPW.id,
        clientId: clientMap["Andra & Nisa"],
        projectDate: new Date("2026-02-14"),
        value: 18000000,
        status: "ONGOING",
      },
    }),
    prisma.project.create({
      data: {
        projectCode: "PRJ-202602-0002",
        name: "Bridal Package Raka & Caca",
        brandId: brandMap.BBP.id,
        clientId: clientMap["Raka & Caca"],
        projectDate: new Date("2026-03-02"),
        value: 7500000,
        status: "BOOKED",
      },
    }),
    prisma.project.create({
      data: {
        projectCode: "PRJ-202603-0003",
        name: "Family Studio Session",
        brandId: brandMap.PHS.id,
        clientId: clientMap["Studio Keluarga Harsa"],
        projectDate: new Date("2026-04-16"),
        value: 3000000,
        status: "BOOKED",
      },
    }),
    prisma.project.create({
      data: {
        projectCode: "PRJ-202601-0004",
        name: "Campaign Harmoni Rasa",
        brandId: brandMap.JMD.id,
        clientId: clientMap["PT Harmoni Rasa"],
        projectDate: new Date("2026-02-21"),
        value: 12000000,
        status: "ONGOING",
      },
    }),
    prisma.project.create({
      data: {
        projectCode: "PRJ-202603-0005",
        name: "Visual Social Kit Q2",
        brandId: brandMap.JVS.id,
        clientId: clientMap["PT Harmoni Rasa"],
        projectDate: new Date("2026-03-18"),
        value: 9500000,
        status: "DONE",
      },
    }),
    prisma.project.create({
      data: {
        projectCode: "PRJ-202603-0006",
        name: "Attire Dimas & Niken",
        brandId: brandMap.WAJ.id,
        clientId: clientMap["Dimas & Niken"],
        projectDate: new Date("2026-04-12"),
        value: 8000000,
        status: "BOOKED",
      },
    }),
  ]);

  const projectMap = Object.fromEntries(projects.map((item) => [item.name, item]));

  const invoiceSeeds = [
    {
      invoiceNo: "INV-202601-0001",
      invoiceDate: new Date("2026-01-08"),
      brandId: brandMap.TPW.id,
      clientId: clientMap["Andra & Nisa"],
      projectId: projectMap["Wedding Andra & Nisa"].id,
      totalAmount: 18000000,
      downPayment: 5000000,
      dueDate: new Date("2026-03-05"),
      notes: "DP 30% lalu pelunasan H-3 event",
    },
    {
      invoiceNo: "INV-202602-0002",
      invoiceDate: new Date("2026-02-10"),
      brandId: brandMap.BBP.id,
      clientId: clientMap["Raka & Caca"],
      projectId: projectMap["Bridal Package Raka & Caca"].id,
      totalAmount: 7500000,
      downPayment: 3000000,
      dueDate: new Date("2026-03-01"),
      notes: "MUA + trial makeup",
    },
    {
      invoiceNo: "INV-202603-0003",
      invoiceDate: new Date("2026-03-28"),
      brandId: brandMap.PHS.id,
      clientId: clientMap["Studio Keluarga Harsa"],
      projectId: projectMap["Family Studio Session"].id,
      totalAmount: 3000000,
      downPayment: 0,
      dueDate: new Date("2026-04-20"),
      notes: "Studio family session full payment after shoot",
    },
    {
      invoiceNo: "INV-202601-0004",
      invoiceDate: new Date("2026-01-15"),
      brandId: brandMap.JMD.id,
      clientId: clientMap["PT Harmoni Rasa"],
      projectId: projectMap["Campaign Harmoni Rasa"].id,
      totalAmount: 12000000,
      downPayment: 6000000,
      dueDate: new Date("2026-02-28"),
      notes: "Campaign retainer Q1",
    },
    {
      invoiceNo: "INV-202603-0005",
      invoiceDate: new Date("2026-03-20"),
      brandId: brandMap.WAJ.id,
      clientId: clientMap["Dimas & Niken"],
      projectId: projectMap["Attire Dimas & Niken"].id,
      totalAmount: 8000000,
      downPayment: 4000000,
      dueDate: new Date("2026-04-30"),
      notes: "Custom attire wedding package",
    },
  ];

  for (const item of invoiceSeeds) {
    const amountPaid = item.downPayment;
    const outstandingAmount = item.totalAmount - amountPaid;
    await prisma.invoice.create({
      data: {
        ...item,
        amountPaid,
        outstandingAmount,
        status: invoiceStatus(item.totalAmount, amountPaid, item.dueDate),
        paidAt: outstandingAmount <= 0 ? new Date() : null,
      },
    });
  }

  const invoices = await prisma.invoice.findMany();
  const invoiceMap = Object.fromEntries(invoices.map((item) => [item.invoiceNo, item]));

  const billSeeds = [
    {
      billNo: "BILL-202602-0001",
      billDate: new Date("2026-02-03"),
      vendorId: vendorMap["Vendor Makeup Partner"],
      brandId: brandMap.BBP.id,
      projectId: projectMap["Bridal Package Raka & Caca"].id,
      description: "Fee makeup artist partner",
      totalAmount: 2500000,
      dueDate: new Date("2026-03-05"),
      notes: "DP vendor dibayar sebagian",
    },
    {
      billNo: "BILL-202602-0002",
      billDate: new Date("2026-02-07"),
      vendorId: vendorMap["CV Sinar Lighting"],
      brandId: brandMap.TPW.id,
      projectId: projectMap["Wedding Andra & Nisa"].id,
      description: "Lighting wedding package",
      totalAmount: 4000000,
      dueDate: new Date("2026-02-25"),
      notes: "Belum dibayar penuh",
    },
    {
      billNo: "BILL-202603-0003",
      billDate: new Date("2026-03-16"),
      vendorId: vendorMap["Digital Ads Jogja"],
      brandId: brandMap.JVS.id,
      projectId: projectMap["Visual Social Kit Q2"].id,
      description: "Iklan lead generation Maret",
      totalAmount: 1200000,
      dueDate: new Date("2026-03-30"),
      notes: "Sudah lunas",
    },
    {
      billNo: "BILL-202603-0004",
      billDate: new Date("2026-03-22"),
      vendorId: vendorMap["Konveksi Wardrobe Prima"],
      brandId: brandMap.WAJ.id,
      projectId: projectMap["Attire Dimas & Niken"].id,
      description: "Produksi kain dan penjahitan",
      totalAmount: 3000000,
      dueDate: new Date("2026-04-18"),
      notes: "Akan dibayar saat fitting terakhir",
    },
  ];

  for (const item of billSeeds) {
    await prisma.vendorBill.create({
      data: {
        ...item,
        amountPaid: 0,
        outstandingAmount: item.totalAmount,
        status: billStatus(item.totalAmount, 0, item.dueDate),
      },
    });
  }

  const bills = await prisma.vendorBill.findMany();
  const billMap = Object.fromEntries(bills.map((item) => [item.billNo, item]));

  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        assetCode: "AST-202601-0001",
        name: "Sony A7 IV",
        brandId: brandMap.TPW.id,
        category: "CAMERA",
        purchaseDate: new Date("2026-01-05"),
        purchasePrice: 28000000,
        usefulLifeMonths: 48,
        monthlyDepreciation: 583333.33,
        accumulatedDepreciation: 0,
        bookValue: 28000000,
        condition: "EXCELLENT",
      },
    }),
    prisma.asset.create({
      data: {
        assetCode: "AST-202602-0002",
        name: "Lighting Kit Godox",
        brandId: brandMap.JVS.id,
        category: "LIGHTING",
        purchaseDate: new Date("2026-02-12"),
        purchasePrice: 9500000,
        usefulLifeMonths: 36,
        monthlyDepreciation: 263888.89,
        accumulatedDepreciation: 0,
        bookValue: 9500000,
        condition: "GOOD",
      },
    }),
    prisma.asset.create({
      data: {
        assetCode: "AST-202603-0003",
        name: "MacBook Pro Editing",
        brandId: brandMap.JMD.id,
        category: "COMPUTER",
        purchaseDate: new Date("2026-03-09"),
        purchasePrice: 32500000,
        usefulLifeMonths: 48,
        monthlyDepreciation: 677083.33,
        accumulatedDepreciation: 0,
        bookValue: 32500000,
        condition: "EXCELLENT",
      },
    }),
  ]);

  for (const asset of assets) {
    await prisma.assetDepreciation.createMany({
      data: assetSchedule(
        asset.id,
        asset.purchaseDate,
        Number(asset.purchasePrice),
        asset.usefulLifeMonths,
      ),
    });
  }

  const transactionSeeds = [
    ["TRX-20260101-0001", "2026-01-08", "TPW", "CLIENT_DP", "CAT-DP", "4101", "DP Wedding Andra & Nisa", "Andra & Nisa", null, "Wedding Andra & Nisa", "Transfer BCA", 5000000, 0, "INV-202601-0001"],
    ["TRX-20260112-0002", "2026-01-12", "TPW", "PRODUCTION_COST", "CAT-PROD", "5101", "Booking vendor dokumentasi tambahan", null, "CV Sinar Lighting", "Wedding Andra & Nisa", "Transfer BCA", 0, 1500000, null],
    ["TRX-20260115-0003", "2026-01-15", "JMD", "CLIENT_DP", "CAT-DP", "4101", "DP Campaign Harmoni Rasa", "PT Harmoni Rasa", null, "Campaign Harmoni Rasa", "Transfer Mandiri", 6000000, 0, "INV-202601-0004"],
    ["TRX-20260122-0004", "2026-01-22", "JVS", "MARKETING", "CAT-MKT", "6101", "Iklan Instagram lead visual", null, "Digital Ads Jogja", "Visual Social Kit Q2", "Transfer BCA", 0, 850000, null],
    ["TRX-20260203-0005", "2026-02-03", "BBP", "CLIENT_DP", "CAT-DP", "4101", "DP Bridal Package Raka & Caca", "Raka & Caca", null, "Bridal Package Raka & Caca", "Transfer BCA", 3000000, 0, "INV-202602-0002"],
    ["TRX-20260204-0006", "2026-02-04", "BBP", "PRODUCTION_COST", "CAT-PROD", "5101", "DP vendor makeup artist", null, "Vendor Makeup Partner", "Bridal Package Raka & Caca", "Transfer BCA", 0, 1500000, null],
    ["TRX-20260207-0007", "2026-02-07", "TPW", "VENDOR_PAYMENT", "CAT-VPAY", "2101", "Pembayaran awal lighting wedding", null, "CV Sinar Lighting", "Wedding Andra & Nisa", "Transfer BCA", 0, 1000000, null],
    ["TRX-20260215-0008", "2026-02-15", "JMD", "SALARY", "CAT-SAL", "6102", "Honor tim produksi Februari", null, null, "Campaign Harmoni Rasa", "Transfer BCA", 0, 2200000, null],
    ["TRX-20260218-0009", "2026-02-18", "PHS", "RENT", "CAT-RENT", "6105", "Sewa ruko studio bulan Februari", null, null, null, "Transfer Mandiri", 0, 3000000, null],
    ["TRX-20260228-0010", "2026-02-28", "JVS", "EQUIPMENT_PURCHASE", "CAT-EQUIP", "1201", "Pembelian lighting kit baru", null, "CV Sinar Lighting", null, "Transfer BCA", 0, 9500000, null],
    ["TRX-20260301-0011", "2026-03-01", "BBP", "CLIENT_SETTLEMENT", "CAT-SETTLE", "4101", "Pelunasan Bridal Package", "Raka & Caca", null, "Bridal Package Raka & Caca", "Transfer BCA", 4500000, 0, "INV-202602-0002"],
    ["TRX-20260304-0012", "2026-03-04", "TPW", "CLIENT_SETTLEMENT", "CAT-SETTLE", "4101", "Pelunasan tahap 2 Wedding Andra & Nisa", "Andra & Nisa", null, "Wedding Andra & Nisa", "Transfer BCA", 10000000, 0, "INV-202601-0001"],
    ["TRX-20260305-0013", "2026-03-05", "TPW", "PRODUCTION_COST", "CAT-PROD", "5101", "Pelunasan vendor lighting", null, "CV Sinar Lighting", "Wedding Andra & Nisa", "Transfer BCA", 0, 2000000, null],
    ["TRX-20260312-0014", "2026-03-12", "JVS", "VENDOR_PAYMENT", "CAT-VPAY", "2101", "Pelunasan iklan digital", null, "Digital Ads Jogja", "Visual Social Kit Q2", "Transfer BCA", 0, 1200000, null],
    ["TRX-20260315-0015", "2026-03-15", "JMD", "TRANSPORT", "CAT-TRN", "6103", "Transport crew shooting", null, "Sewa Mobil Event", "Campaign Harmoni Rasa", "Cash", 0, 650000, null],
    ["TRX-20260318-0016", "2026-03-18", "JVS", "INCOME", "CAT-INCOME", "4101", "Fee visual social kit Maret", "PT Harmoni Rasa", null, "Visual Social Kit Q2", "Transfer Mandiri", 9500000, 0, null],
    ["TRX-20260320-0017", "2026-03-20", "WAJ", "CLIENT_DP", "CAT-DP", "4101", "DP attire Dimas & Niken", "Dimas & Niken", null, "Attire Dimas & Niken", "Transfer BCA", 4000000, 0, "INV-202603-0005"],
    ["TRX-20260321-0018", "2026-03-21", "WAJ", "PRODUCTION_COST", "CAT-PROD", "5101", "Pembelian bahan attire", null, "Konveksi Wardrobe Prima", "Attire Dimas & Niken", "Transfer BCA", 0, 1000000, null],
    ["TRX-20260325-0019", "2026-03-25", "JVS", "UTILITY", "CAT-UTL", "6104", "Internet dan cloud tools", null, null, null, "Transfer Mandiri", 0, 475000, null],
    ["TRX-20260328-0020", "2026-03-28", "PHS", "INCOME", "CAT-INCOME", "4101", "Booking studio keluarga", "Studio Keluarga Harsa", null, "Family Studio Session", "QRIS", 1000000, 0, "INV-202603-0003"],
    ["TRX-20260401-0021", "2026-04-01", "BBP", "SALARY", "CAT-SAL", "6102", "Gaji tim makeup awal April", null, null, null, "Transfer BCA", 0, 1800000, null],
    ["TRX-20260402-0022", "2026-04-02", "WAJ", "VENDOR_PAYMENT", "CAT-VPAY", "2101", "Pembayaran tahap 1 konveksi", null, "Konveksi Wardrobe Prima", "Attire Dimas & Niken", "Transfer BCA", 0, 500000, null],
    ["TRX-20260403-0023", "2026-04-03", "TPW", "TRANSPORT", "CAT-TRN", "6103", "Transport meeting client", null, null, "Wedding Andra & Nisa", "Cash", 0, 250000, null],
    ["TRX-20260404-0024", "2026-04-04", "JMD", "MARKETING", "CAT-MKT", "6101", "Retargeting ads campaign April", null, "Digital Ads Jogja", "Campaign Harmoni Rasa", "Transfer BCA", 0, 900000, null],
  ] as const;

  for (const seed of transactionSeeds) {
    const [transactionNo, transactionDate, brandCode, transactionType, categoryCode, accountCode, description, clientName, vendorName, projectName, paymentMethodName, amountIn, amountOut, invoiceNo] = seed;
    const project = projectName ? projectMap[projectName] : null;

    await prisma.transaction.create({
      data: {
        transactionNo,
        transactionDate: new Date(transactionDate),
        brandId: brandMap[brandCode].id,
        transactionType,
        categoryId: categoryMap[categoryCode],
        accountId: accountMap[accountCode],
        description,
        clientId: clientName ? clientMap[clientName] : null,
        vendorId: vendorName ? vendorMap[vendorName] : null,
        projectId: project?.id ?? null,
        paymentMethodId: paymentMethodMap[paymentMethodName],
        paymentStatus: amountOut > 0 ? "PAID" : "PAID",
        amountIn,
        amountOut,
        referenceNo: invoiceNo ?? null,
        invoiceId: invoiceNo ? invoiceMap[invoiceNo]?.id ?? null : null,
        vendorBillId:
          vendorName === "Vendor Makeup Partner"
            ? billMap["BILL-202602-0001"].id
            : vendorName === "CV Sinar Lighting" && amountOut > 0
              ? billMap["BILL-202602-0002"].id
              : vendorName === "Digital Ads Jogja" && amountOut > 0
                ? billMap["BILL-202603-0003"].id
                : vendorName === "Konveksi Wardrobe Prima" && amountOut > 0
                  ? billMap["BILL-202603-0004"].id
                  : null,
        enteredById: admin.id,
      },
    });
  }

  for (const invoice of invoices) {
    const linkedTransactions = await prisma.transaction.findMany({
      where: { invoiceId: invoice.id },
    });
    const amountPaid = linkedTransactions.reduce((sum, tx) => sum + Number(tx.amountIn), 0);
    const downPayment = linkedTransactions
      .filter((tx) => tx.transactionType === "CLIENT_DP")
      .reduce((sum, tx) => sum + Number(tx.amountIn), 0);
    const outstandingAmount = Math.max(Number(invoice.totalAmount) - amountPaid, 0);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid,
        downPayment,
        outstandingAmount,
        status: invoiceStatus(Number(invoice.totalAmount), amountPaid, invoice.dueDate),
        paidAt: outstandingAmount <= 0 ? new Date() : null,
      },
    });
  }

  for (const bill of bills) {
    const linkedTransactions = await prisma.transaction.findMany({
      where: { vendorBillId: bill.id },
    });
    const amountPaid = linkedTransactions.reduce((sum, tx) => sum + Number(tx.amountOut), 0);
    const outstandingAmount = Math.max(Number(bill.totalAmount) - amountPaid, 0);
    await prisma.vendorBill.update({
      where: { id: bill.id },
      data: {
        amountPaid,
        outstandingAmount,
        status: billStatus(Number(bill.totalAmount), amountPaid, bill.dueDate),
        paidAt: outstandingAmount <= 0 ? new Date() : null,
      },
    });
  }

  for (const project of projects) {
    const linkedTransactions = await prisma.transaction.findMany({
      where: { projectId: project.id },
    });

    const recognizedIncome = linkedTransactions.reduce(
      (sum, tx) => sum + Number(tx.amountIn),
      0,
    );
    const recognizedCost = linkedTransactions.reduce(
      (sum, tx) => sum + Number(tx.amountOut),
      0,
    );

    await prisma.project.update({
      where: { id: project.id },
      data: {
        recognizedIncome,
        recognizedCost,
        profit: recognizedIncome - recognizedCost,
      },
    });
  }

  await prisma.activityLog.createMany({
    data: [
      {
        action: "CREATE",
        entityType: "Seed",
        description: "Seed awal Rumah Jengkar Finance berhasil dijalankan.",
        userId: owner.id,
      },
      {
        action: "CREATE",
        entityType: "Transaction",
        description: "20+ transaksi dummy berhasil dibuat untuk testing dashboard.",
        userId: admin.id,
        brandId: brandMap.TPW.id,
      },
    ],
  });

  console.log("Seed Rumah Jengkar Finance selesai.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
