import { eq } from "drizzle-orm";

import { type CostLensDb, workspace } from "@costlens/database";

export const DEFAULT_WORKSPACE_SLUG = "default";

export async function ensureWorkspace(db: CostLensDb, slug: string) {
  const existing = await db
    .select()
    .from(workspace)
    .where(eq(workspace.slug, slug))
    .get();
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  await db.insert(workspace).values({
    id,
    name: slug === DEFAULT_WORKSPACE_SLUG ? "Primary workspace" : slug,
    slug,
  });
  const created = await db
    .select()
    .from(workspace)
    .where(eq(workspace.slug, slug))
    .get();
  if (!created) {
    throw new Error("Failed to create workspace");
  }
  return created;
}
