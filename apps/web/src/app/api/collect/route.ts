import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace";
import { ingestWorkspaceCosts } from "@/server/ingest-workspace-costs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    workspaceSlug?: string;
  };
  const slug = body.workspaceSlug ?? DEFAULT_WORKSPACE_SLUG;
  const db = getDb();
  const summary = await ingestWorkspaceCosts(db, slug);
  return NextResponse.json({ ok: true, ...summary });
}
