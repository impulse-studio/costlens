import { runCollectors } from "@costlens/collectors";
import {
  type CostLensDb,
  collectorRun,
  costLineItem,
} from "@costlens/database";

import { ensureWorkspace } from "@/lib/workspace";

export type IngestSummary = {
  workspaceId: string;
  inserted: number;
  runs: { provider: string; status: string; itemCount: number }[];
};

export async function ingestWorkspaceCosts(
  db: CostLensDb,
  workspaceSlug: string,
): Promise<IngestSummary> {
  const ws = await ensureWorkspace(db, workspaceSlug);
  const results = await runCollectors({ workspaceSlug });
  let inserted = 0;
  const runs: IngestSummary["runs"] = [];

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
      runs.push({
        provider: result.provider,
        status: "failed",
        itemCount: 0,
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
    runs.push({
      provider: result.provider,
      status: "ok",
      itemCount: result.items.length,
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

  return { workspaceId: ws.id, inserted, runs };
}
