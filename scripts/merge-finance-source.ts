import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

type Mode = "stats" | "dry-run" | "apply" | "export-json";

type TableConfig = {
  key: string;
  uniqueFields: string[][];
  treatUniqueMatchAsSatisfied?: boolean;
};

type Conflict = {
  table: string;
  sourceId: string;
  targetId: string;
  fields: string[];
  values: string;
};

type ReadRowsResult = {
  rows: Array<Record<string, unknown>>;
  missingTable: boolean;
};

const APPLY_CONFIRM_TOKEN = "MERGE_FINANCE_SOURCE";

const TABLES: TableConfig[] = [
  { key: "role", uniqueFields: [["key"]] },
  { key: "brand", uniqueFields: [["code"], ["slug"]] },
  { key: "transactionCategory", uniqueFields: [["code"]] },
  { key: "user", uniqueFields: [["email"]] },
  { key: "userBrandAccess", uniqueFields: [["userId", "brandId"]], treatUniqueMatchAsSatisfied: true },
  { key: "client", uniqueFields: [["name", "email", "phone"]] },
  { key: "vendor", uniqueFields: [["name", "email", "phone"]] },
  { key: "paymentMethod", uniqueFields: [["name", "accountName", "accountNo", "isCash"]] },
  { key: "brandClient", uniqueFields: [["brandId", "clientId"]], treatUniqueMatchAsSatisfied: true },
  { key: "brandVendor", uniqueFields: [["brandId", "vendorId"]], treatUniqueMatchAsSatisfied: true },
  { key: "brandPaymentMethod", uniqueFields: [["brandId", "paymentMethodId"]], treatUniqueMatchAsSatisfied: true },
  { key: "account", uniqueFields: [["code"]] },
  { key: "project", uniqueFields: [["projectCode"]] },
  { key: "invoice", uniqueFields: [["invoiceNo"]] },
  {
    key: "invoiceAdditionalItem",
    uniqueFields: [["invoiceId", "name", "quantity", "unitPrice", "totalAmount"]],
  },
  { key: "vendorBill", uniqueFields: [["billNo"]] },
  { key: "asset", uniqueFields: [["assetCode"]] },
  { key: "assetDepreciation", uniqueFields: [["assetId", "periodStart", "periodEnd", "amount"]] },
  { key: "transaction", uniqueFields: [["transactionNo"]] },
  { key: "attachment", uniqueFields: [["kind", "fileName", "storagePath"]] },
  { key: "activityLog", uniqueFields: [["action", "entityType", "entityId", "description", "createdAt"]] },
];

function getArgValue(name: string) {
  const inlineArg = process.argv.find((value) => value.startsWith(`--${name}=`));

  if (inlineArg) {
    return inlineArg.split("=", 2)[1];
  }

  const flagIndex = process.argv.indexOf(`--${name}`);

  if (flagIndex >= 0) {
    return process.argv[flagIndex + 1];
  }

  return undefined;
}

function getMode(): Mode {
  const mode = getArgValue("mode") as Mode | undefined;

  if (!mode || !["stats", "dry-run", "apply", "export-json"].includes(mode)) {
    return "stats";
  }

  return mode;
}

function getOutputPath(mode: Mode) {
  const explicit = getArgValue("output");

  if (explicit) {
    return path.resolve(process.cwd(), explicit);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve(process.cwd(), "backups", `finance-merge-${mode}-${timestamp}.json`);
}

function ensureApplyConfirmed(mode: Mode) {
  if (mode !== "apply") {
    return;
  }

  const confirm = getArgValue("confirm");

  if (confirm !== APPLY_CONFIRM_TOKEN) {
    throw new Error(
      `Apply mode requires --confirm=${APPLY_CONFIRM_TOKEN} to prevent accidental writes.`,
    );
  }
}

function normalizeSourceUrl() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL?.trim();

  if (!sourceUrl) {
    throw new Error("SOURCE_DATABASE_URL is required.");
  }

  if (sourceUrl.includes("pooler.supabase.com") && !sourceUrl.includes("pgbouncer=true")) {
    return sourceUrl.includes("?")
      ? `${sourceUrl}&pgbouncer=true&connection_limit=1`
      : `${sourceUrl}?pgbouncer=true&connection_limit=1`;
  }

  return sourceUrl;
}

function normalizeTargetUrl() {
  const targetUrl =
    process.env.TARGET_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (!targetUrl) {
    throw new Error("TARGET_DATABASE_URL or DATABASE_URL is required.");
  }

  return targetUrl;
}

function createClient(url: string) {
  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
}

async function getStats(client: PrismaClient) {
  const [
    transactions,
    invoices,
    clients,
    brands,
    users,
    projects,
    vendorBills,
    paymentMethods,
    categories,
  ] = await Promise.all([
    client.transaction.count(),
    client.invoice.count(),
    client.client.count(),
    client.brand.count(),
    client.user.count(),
    client.project.count(),
    client.vendorBill.count(),
    client.paymentMethod.count(),
    client.transactionCategory.count(),
  ]);

  const latestTransaction = await client.transaction.findFirst({
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      transactionNo: true,
      transactionDate: true,
      createdAt: true,
      description: true,
      amountIn: true,
      amountOut: true,
      brand: { select: { name: true } },
      enteredBy: { select: { email: true } },
    },
  });

  const recentTransactions = await client.transaction.findMany({
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: {
      id: true,
      transactionNo: true,
      transactionDate: true,
      createdAt: true,
      description: true,
      amountIn: true,
      amountOut: true,
      brand: { select: { name: true } },
      enteredBy: { select: { email: true } },
    },
  });

  return {
    counts: {
      transactions,
      invoices,
      clients,
      brands,
      users,
      projects,
      vendorBills,
      paymentMethods,
      categories,
    },
    latestTransaction,
    recentTransactions,
  };
}

function isMissingTableError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2021",
  );
}

async function readAllRows(client: PrismaClient, key: string): Promise<ReadRowsResult> {
  const delegate = (client as Record<string, any>)[key];

  if (!delegate || typeof delegate.findMany !== "function") {
    throw new Error(`Unknown Prisma delegate: ${key}`);
  }

  try {
    const rows = await delegate.findMany();
    return {
      rows,
      missingTable: false,
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        rows: [],
        missingTable: true,
      };
    }

    throw error;
  }
}

function buildFieldSignature(row: Record<string, unknown>, fields: string[]) {
  return fields
    .map((field) => {
      const value = row[field];

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (typeof value === "bigint") {
        return value.toString();
      }

      if (
        value &&
        typeof value === "object" &&
        "toJSON" in value &&
        typeof value.toJSON === "function"
      ) {
        return JSON.stringify(value.toJSON());
      }

      return JSON.stringify(value ?? null);
    })
    .join("|");
}

function findConflicts(
  table: TableConfig,
  sourceRows: Array<Record<string, unknown>>,
  targetRows: Array<Record<string, unknown>>,
) {
  const conflicts: Conflict[] = [];
  const targetById = new Map(targetRows.map((row) => [String(row.id), row]));
  const missingRows = sourceRows.filter((row) => !targetById.has(String(row.id)));
  const satisfiedSourceIds = new Set<string>();

  for (const fields of table.uniqueFields) {
    const targetBySignature = new Map<string, Record<string, unknown>>();

    for (const row of targetRows) {
      const signature = buildFieldSignature(row, fields);
      targetBySignature.set(signature, row);
    }

    for (const row of missingRows) {
      const signature = buildFieldSignature(row, fields);
      const existing = targetBySignature.get(signature);

      if (existing && String(existing.id) !== String(row.id)) {
        if (table.treatUniqueMatchAsSatisfied) {
          satisfiedSourceIds.add(String(row.id));
          continue;
        }

        conflicts.push({
          table: table.key,
          sourceId: String(row.id),
          targetId: String(existing.id),
          fields,
          values: signature,
        });
      }
    }
  }

  return {
    conflicts,
    missingRows: missingRows.filter((row) => !satisfiedSourceIds.has(String(row.id))),
    satisfiedCount: satisfiedSourceIds.size,
  };
}

function serializeReport(value: unknown) {
  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (typeof currentValue === "bigint") {
        return currentValue.toString();
      }

      return currentValue;
    },
    2,
  );
}

function writeReport(report: unknown, outputPath: string) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serializeReport(report), "utf8");
}

async function exportSourceJson(source: PrismaClient) {
  const exported: Record<string, unknown> = {};
  const missingTables: string[] = [];

  for (const table of TABLES) {
    const result = await readAllRows(source, table.key);
    exported[table.key] = result.rows;

    if (result.missingTable) {
      missingTables.push(table.key);
    }
  }

  return {
    exported,
    missingTables,
  };
}

async function applyMerge(
  target: PrismaClient,
  mergePlan: Array<{ table: string; rows: Array<Record<string, unknown>> }>,
) {
  await target.$transaction(
    async (tx) => {
      for (const item of mergePlan) {
        if (item.rows.length === 0) {
          continue;
        }

        const delegate = (tx as Record<string, any>)[item.table];

        for (const row of item.rows) {
          await delegate.create({ data: row });
        }
      }
    },
    {
      timeout: 120_000,
    },
  );
}

async function main() {
  const mode = getMode();
  const outputPath = getOutputPath(mode);

  ensureApplyConfirmed(mode);

  const source = createClient(normalizeSourceUrl());
  const target = mode === "export-json" ? null : createClient(normalizeTargetUrl());

  try {
    const sourceStats = await getStats(source);
    const report: Record<string, unknown> = {
      mode,
      generatedAt: new Date().toISOString(),
      sourceStats,
    };

    if (target) {
      report.targetStats = await getStats(target);
    }

    if (mode === "stats") {
      writeReport(report, outputPath);
      console.log(`Stats report written to ${outputPath}`);
      return;
    }

    if (mode === "export-json") {
      const sourceExport = await exportSourceJson(source);
      report.sourceExport = sourceExport.exported;
      report.sourceMissingTables = sourceExport.missingTables;
      writeReport(report, outputPath);
      console.log(`Source export written to ${outputPath}`);
      return;
    }

    if (!target) {
      throw new Error("Target client was not initialized.");
    }

    const mergePlan: Array<{ table: string; rows: Array<Record<string, unknown>> }> = [];
    const conflicts: Conflict[] = [];
    const missingSummary: Record<string, number> = {};
    const satisfiedSummary: Record<string, number> = {};
    const sourceMissingTables: string[] = [];
    const targetMissingTables: string[] = [];

    for (const table of TABLES) {
      const [sourceResult, targetResult] = await Promise.all([
        readAllRows(source, table.key),
        readAllRows(target, table.key),
      ]);

      if (sourceResult.missingTable) {
        sourceMissingTables.push(table.key);
      }

      if (targetResult.missingTable) {
        targetMissingTables.push(table.key);
      }

      const { conflicts: tableConflicts, missingRows, satisfiedCount } = findConflicts(
        table,
        sourceResult.rows,
        targetResult.rows,
      );

      missingSummary[table.key] = missingRows.length;
      satisfiedSummary[table.key] = satisfiedCount;
      mergePlan.push({ table: table.key, rows: missingRows });
      conflicts.push(...tableConflicts);
    }

    report.missingSummary = missingSummary;
    report.satisfiedSummary = satisfiedSummary;
    report.conflicts = conflicts;
    report.conflictCount = conflicts.length;
    report.sourceMissingTables = sourceMissingTables;
    report.targetMissingTables = targetMissingTables;

    if (mode === "dry-run") {
      writeReport(report, outputPath);
      console.log(`Dry-run report written to ${outputPath}`);
      return;
    }

    if (targetMissingTables.length > 0) {
      report.aborted = "Target schema is missing tables. Run dry-run and align schema before apply.";
      writeReport(report, outputPath);
      console.log(`Apply aborted. Target schema issue report written to ${outputPath}`);
      process.exitCode = 1;
      return;
    }

    if (conflicts.length > 0) {
      report.aborted = "Conflicts detected. Resolve before apply.";
      writeReport(report, outputPath);
      console.log(`Apply aborted. Conflict report written to ${outputPath}`);
      process.exitCode = 1;
      return;
    }

    await applyMerge(target, mergePlan);

    report.targetStatsAfter = await getStats(target);
    writeReport(report, outputPath);
    console.log(`Apply report written to ${outputPath}`);
  } finally {
    const disconnects = [source.$disconnect()];

    if (target) {
      disconnects.push(target.$disconnect());
    }

    await Promise.allSettled(disconnects);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
