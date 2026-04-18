import { NextResponse } from "next/server";

import { runCollectors } from "@costlens/collectors";
import { collectorRun, costLineItem } from "@costlens/database";

import { getDb } from "@/lib/db";
import { DEFAULT_WORKSPACE_SLUG, ensureWorkspace } from "@/lib/workspace";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    workspaceSlug?: string;
  };
  const slug = body.workspaceSlug ?? DEFAULT_WORKSPACE_SLUG;
  const db = getDb();
  const ws = await ensureWorkspace(db, slug);
  const results = await runCollectors({ workspaceSlug: slug });
  let inserted = 0;

  for (const result of results) {
    const runId = crypto.randomUUID();
    const started = new Date().toISOString();
    if (result.errorMessage) {
      await db.insert(collectorRun).values({
        id: runId,
        workspaceId: ws.id,
        provider: result.provider,
        status: "failed",
        itemCount: 0,
        errorMessage: result.errorMessage,
        startedAt: started,
        finishedAt: new Date().toISOString(),
      });
      continue;
    }
    await db.insert(collectorRun).values({
      id: runId,
      workspaceId: ws.id,
      provider: result.provider,
      status: "ok",
      itemCount: result.items.length,
      startedAt: started,
      finishedAt: new Date().toISOString(),
    });
    for (const item of result.items) {
      await db.insert(costLineItem).values({
        id: crypto.randomUUID(),
        workspaceId: ws.id,
        projectId: item.projectId ?? null,
        provider: item.provider,
        service: item.service,
        amountCents: item.amountCents,
        currency: item.currency,
        periodLabel: item.periodLabel,
        externalRef: item.externalRef,
        metadataJson: item.metadata
          ? JSON.stringify(item.metadata)
          : null,
      });
      inserted += 1;
    }
  }

  return NextResponse.json({ ok: true, inserted, workspaceId: ws.id });
}
