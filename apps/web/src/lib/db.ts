import { createSqlite, type CostLensDb } from "@costlens/database";

import { resolveSqliteDatabaseFile } from "@/lib/database-path";

const globalForDb = globalThis as unknown as {
  __costlensDb?: CostLensDb;
};

export function getDb(): CostLensDb {
  if (globalForDb.__costlensDb) {
    return globalForDb.__costlensDb;
  }
  const resolved = resolveSqliteDatabaseFile();
  globalForDb.__costlensDb = createSqlite(resolved);
  return globalForDb.__costlensDb;
}
