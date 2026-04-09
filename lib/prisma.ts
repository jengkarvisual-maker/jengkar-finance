import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return undefined;
  }

  const isSupabaseTransactionPooler =
    url.includes("pooler.supabase.com:6543") && !url.includes("pgbouncer=true");

  if (!isSupabaseTransactionPooler) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}pgbouncer=true`;
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const databaseUrl = resolveDatabaseUrl();

    return new PrismaClient({
      log: ["warn", "error"],
      ...(databaseUrl
        ? {
            datasources: {
              db: {
                url: databaseUrl,
              },
            },
          }
        : {}),
    });
  })();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
