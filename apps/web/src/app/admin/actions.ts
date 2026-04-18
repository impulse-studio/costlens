"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  apiKeyProjectMapping,
  oidcProjectMapping,
  project,
  workspace,
} from "@costlens/database";

import { getDb } from "@/lib/db";
import { apiKeyDisplayPrefix, sha256Hex } from "@/lib/hash-api-key";

export type FormState = { error?: string; ok?: string };

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function readTrimmed(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createWorkspace(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = readTrimmed(formData, "name");
  let slug = readTrimmed(formData, "slug");
  if (!name) {
    return { error: "Workspace name is required." };
  }
  if (!slug) {
    slug = normalizeSlug(name);
  } else {
    slug = normalizeSlug(slug);
  }
  if (!SLUG_RE.test(slug)) {
    return {
      error:
        "Slug must be lowercase letters, digits, or hyphen (cannot start with hyphen).",
    };
  }
  const db = getDb();
  try {
    await db.insert(workspace).values({
      id: crypto.randomUUID(),
      name,
      slug,
    });
  } catch {
    return { error: "Could not create workspace (slug may already exist)." };
  }
  revalidatePath("/admin");
  return { ok: `Workspace “${slug}” created.` };
}

export async function createProject(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const workspaceId = readTrimmed(formData, "workspaceId");
  const name = readTrimmed(formData, "name");
  let slug = readTrimmed(formData, "slug");
  const vercelProjectId = readTrimmed(formData, "vercelProjectId") || null;
  if (!workspaceId || !name) {
    return { error: "Workspace and project name are required." };
  }
  if (!slug) {
    slug = normalizeSlug(name);
  } else {
    slug = normalizeSlug(slug);
  }
  if (!SLUG_RE.test(slug)) {
    return {
      error:
        "Project slug must be lowercase letters, digits, or hyphen (cannot start with hyphen).",
    };
  }
  const db = getDb();
  try {
    await db.insert(project).values({
      id: crypto.randomUUID(),
      workspaceId,
      name,
      slug,
      vercelProjectId,
    });
  } catch {
    return {
      error: "Could not create project (slug may already exist in workspace).",
    };
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: `Project “${slug}” created.` };
}

const PROVIDERS = new Set(["vercel", "openai", "anthropic", "aws"]);

function parseWorkspaceProject(raw: string): { workspaceId: string; projectId: string } | null {
  const parts = raw.split("::");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { workspaceId: parts[0], projectId: parts[1] };
}

export async function linkApiKey(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const compound = readTrimmed(formData, "workspaceProject");
  const parsed = parseWorkspaceProject(compound);
  const apiKey = readTrimmed(formData, "apiKey");
  const provider = readTrimmed(formData, "provider");
  const label = readTrimmed(formData, "label") || null;
  if (!parsed || !apiKey || !provider) {
    return { error: "Project, provider, and API key are required." };
  }
  const { workspaceId, projectId } = parsed;
  if (!PROVIDERS.has(provider)) {
    return { error: "Invalid provider." };
  }
  const proj = await getDb()
    .select()
    .from(project)
    .where(
      and(eq(project.id, projectId), eq(project.workspaceId, workspaceId)),
    )
    .get();
  if (!proj) {
    return { error: "Project not found in that workspace." };
  }
  const apiKeyHash = await sha256Hex(apiKey);
  const apiKeyPrefix = apiKeyDisplayPrefix(apiKey);
  const now = new Date().toISOString();
  try {
    await getDb().insert(apiKeyProjectMapping).values({
      id: crypto.randomUUID(),
      workspaceId,
      projectId,
      apiKeyPrefix,
      apiKeyHash,
      provider,
      label,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return {
      error:
        "Could not save mapping (duplicate API key hash or invalid data).",
    };
  }
  revalidatePath("/admin");
  return { ok: "API key linked to project (only a hash is stored)." };
}

export async function linkOidcSub(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const compound = readTrimmed(formData, "workspaceProject");
  const parsed = parseWorkspaceProject(compound);
  const oidcSub = readTrimmed(formData, "oidcSub");
  if (!parsed || !oidcSub) {
    return { error: "Project and OIDC subject are required." };
  }
  const { workspaceId, projectId } = parsed;
  const proj = await getDb()
    .select()
    .from(project)
    .where(
      and(eq(project.id, projectId), eq(project.workspaceId, workspaceId)),
    )
    .get();
  if (!proj) {
    return { error: "Project not found in that workspace." };
  }
  try {
    await getDb().insert(oidcProjectMapping).values({
      id: crypto.randomUUID(),
      workspaceId,
      projectId,
      oidcSub,
    });
  } catch {
    return { error: "Could not save OIDC mapping." };
  }
  revalidatePath("/admin");
  return { ok: "OIDC subject linked to project." };
}

export async function deleteApiKeyMappingAction(formData: FormData) {
  const id = readTrimmed(formData, "id");
  if (!id) {
    return;
  }
  await getDb().delete(apiKeyProjectMapping).where(eq(apiKeyProjectMapping.id, id));
  revalidatePath("/admin");
}

export async function deleteOidcMappingAction(formData: FormData) {
  const id = readTrimmed(formData, "id");
  if (!id) {
    return;
  }
  await getDb().delete(oidcProjectMapping).where(eq(oidcProjectMapping.id, id));
  revalidatePath("/admin");
}

export async function deleteProjectAction(formData: FormData) {
  const id = readTrimmed(formData, "id");
  if (!id) {
    return;
  }
  await getDb().delete(project).where(eq(project.id, id));
  revalidatePath("/admin");
  revalidatePath("/");
}
