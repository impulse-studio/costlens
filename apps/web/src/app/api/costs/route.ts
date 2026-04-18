import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { collectorRun, costLineItem } from "@costlens/database";

import { getDb } from "@/lib/db";
import { DEFAULT_WORKSPACE_SLUG, ensureWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("workspace") ?? DEFAULT_WORKSPACE_SLUG;
  const db = getDb();
  const ws = await ensureWorkspace(db, slug);

  const totals = await db
    .select({
      provider: costLineItem.provider,
      totalCents: sql<number>`coalesce(sum(${costLineItem.amountCents}), 0)`,
    })
    .from(costLineItem)
    .where(eq(costLineItem.workspaceId, ws.id))
    .groupBy(costLineItem.provider);

  const lines = await db
    .select({
      id: costLineItem.id,
      provider: costLineItem.provider,
      service: costLineItem.service,
      amountCents: costLineItem.amountCents,
      currency: costLineItem.currency,
      periodLabel: costLineItem.periodLabel,
      collectedAt: costLineItem.collectedAt,
    })
    .from(costLineItem)
    .where(eq(costLineItem.workspaceId, ws.id))
    .orderBy(desc(costLineItem.collectedAt))
    .limit(50);

  const runs = await db
    .select({
      id: collectorRun.id,
      provider: collectorRun.provider,
      status: collectorRun.status,
      itemCount: collectorRun.itemCount,
      startedAt: collectorRun.startedAt,
      finishedAt: collectorRun.finishedAt,
    })
    .from(collectorRun)
    .where(eq(collectorRun.workspaceId, ws.id))
    .orderBy(desc(collectorRun.startedAt))
    .limit(20);

  const grandTotal = totals.reduce((acc, row) => acc + Number(row.totalCents), 0);

  return NextResponse.json({
    workspace: { id: ws.id, slug: ws.slug, name: ws.name },
    grandTotalCents: grandTotal,
    byProvider: totals.map((t) => ({
      provider: t.provider,
      totalCents: Number(t.totalCents),
    })),
    lines,
    runs,
  });
}
