import { anthropicCollector } from "./anthropic";
import { awsCollector } from "./aws";
import { openaiCollector } from "./openai";
import type { CollectorResult, CostCollector } from "./types";
import { vercelCollector } from "./vercel";

export * from "./types";
export {
  anthropicCollector,
  awsCollector,
  openaiCollector,
  vercelCollector,
};

const defaultCollectors: CostCollector[] = [
  vercelCollector,
  openaiCollector,
  anthropicCollector,
  awsCollector,
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
