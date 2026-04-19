import { defineConfig } from "drizzle-kit";

const url =
  process.env.COSTLENS_DATABASE_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "Missing COSTLENS_DATABASE_URL (or DATABASE_URL) for CostLens migrations",
  );
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
