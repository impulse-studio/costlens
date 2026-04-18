import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

export function createSqlite(pathToFile: string) {
  const resolved = path.isAbsolute(pathToFile)
    ? pathToFile
    : path.join(/* turbopackIgnore: true */ process.cwd(), pathToFile);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const url = pathToFileURL(resolved).href;
  const client = createClient({ url });
  return drizzle({ client, schema });
}

export type CostLensDb = ReturnType<typeof createSqlite>;
