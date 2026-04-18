import path from "node:path";

import { createSqlite, type CostLensDb } from "@costlens/database";

const globalForDb = globalThis as unknown as {
  __costlensDb?: CostLensDb;
};

export function getDb(): CostLensDb {
  if (globalForDb.__costlensDb) {
    return globalForDb.__costlensDb;
  }
  const file =
    process.env.COSTLENS_DATABASE_PATH ??
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "..",
      "..",
      "data",
      "costlens.db",
    );
  const resolved = path.isAbsolute(file)
    ? file
    : path.join(/* turbopackIgnore: true */ process.cwd(), file);
  globalForDb.__costlensDb = createSqlite(resolved);
  return globalForDb.__costlensDb;
}
