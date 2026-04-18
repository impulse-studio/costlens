import { anthropicCollector } from "./anthropic";
import { neonCollector } from "./neon";
import { openaiCollector } from "./openai";
import type { CollectorResult, CostCollector } from "./types";
import { vercelCollector } from "./vercel";

export * from "./types";
export {
  anthropicCollector,
  neonCollector,
  openaiCollector,
  vercelCollector,
};

const defaultCollectors: CostCollector[] = [
  vercelCollector,
  openaiCollector,
  anthropicCollector,
  neonCollector,
];

export async function runCollectors(input: {
  workspaceSlug: string;
  vercelProjectId?: string | null;
  collectors?: CostCollector[];
}): Promise<CollectorResult[]> {
  const list = input.collectors ?? defaultCollectors;
  const ctx = {
    workspaceSlug: input.workspaceSlug,
    vercelProjectId: input.vercelProjectId,
  };
  return Promise.all(list.map((c) => c.collect(ctx)));
}
