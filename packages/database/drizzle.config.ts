import { defineConfig } from "drizzle-kit";

const url =
  process.env.COSTLENS_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:../../data/costlens.db";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url },
});
