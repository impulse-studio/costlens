import { createDatabase, type CostLensDb } from "@costlens/database";

const globalForDb = globalThis as unknown as {
  __costlensDb?: CostLensDb;
};

function getDatabaseUrl() {
  const databaseUrl =
    process.env.COSTLENS_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Missing COSTLENS_DATABASE_URL (or DATABASE_URL) for CostLens",
    );
  }

  return databaseUrl;
}

export function getDb(): CostLensDb {
  if (globalForDb.__costlensDb) {
    return globalForDb.__costlensDb;
  }

  globalForDb.__costlensDb = createDatabase(getDatabaseUrl());
  return globalForDb.__costlensDb;
}
