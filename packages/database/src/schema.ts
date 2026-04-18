import { index, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    vercelProjectId: text("vercel_project_id"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("project_workspace_idx").on(table.workspaceId),
    unique("project_slug_workspace_unique").on(
      table.workspaceId,
      table.slug,
    ),
  ],
);

export const costLineItem = pgTable(
  "cost_line_item",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    service: text("service").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    periodLabel: text("period_label").notNull(),
    externalRef: text("external_ref"),
    metadataJson: text("metadata_json"),
    collectedAt: text("collected_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index("cost_line_item_workspace_idx").on(t.workspaceId),
    index("cost_line_item_provider_idx").on(t.provider),
  ],
);

export const apiKeyProjectMapping = pgTable(
  "api_key_project_mapping",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    apiKeyPrefix: text("api_key_prefix").notNull(),
    apiKeyHash: text("api_key_hash").notNull().unique(),
    provider: text("provider").notNull(),
    label: text("label"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("akpm_project_idx").on(table.projectId),
    index("akpm_workspace_idx").on(table.workspaceId),
  ],
);

export const oidcProjectMapping = pgTable(
  "oidc_project_mapping",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    oidcSub: text("oidc_sub").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("oidc_pm_project_idx").on(table.projectId)],
);

export const collectorRun = pgTable(
  "collector_run",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull(),
    itemCount: integer("item_count").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: text("started_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    finishedAt: text("finished_at"),
  },
  (t) => [index("collector_run_workspace_idx").on(t.workspaceId)],
);
