import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace";
import { ingestWorkspaceCosts } from "@/server/ingest-workspace-costs";

function authorizePoll(req: Request): boolean {
  const secret = process.env.COSTLENS_POLL_SECRET;
  if (!secret) {
    return true;
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  const header = req.headers.get("x-costlens-secret");
  return header === secret;
}

/**
 * Cron / worker entry: same ingestion as POST /api/collect, optionally gated by
 * COSTLENS_POLL_SECRET (Bearer or x-costlens-secret).
 */
export async function POST(req: Request) {
  if (!authorizePoll(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    workspaceSlug?: string;
  };
  const slug = body.workspaceSlug ?? DEFAULT_WORKSPACE_SLUG;
  const db = getDb();
  const summary = await ingestWorkspaceCosts(db, slug);
  return NextResponse.json({ ok: true, polled: true, ...summary });
}

/**
 * Vercel Cron and similar often use GET. Same auth rules as POST.
 */
export async function GET(req: Request) {
  if (!authorizePoll(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const slug = url.searchParams.get("workspace") ?? DEFAULT_WORKSPACE_SLUG;
  const db = getDb();
  const summary = await ingestWorkspaceCosts(db, slug);
  return NextResponse.json({ ok: true, polled: true, ...summary });
}
