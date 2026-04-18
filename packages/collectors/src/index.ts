import { awsCollector } from "./aws";
import { openaiCollector } from "./openai";
import type { CollectorResult, CostCollector } from "./types";
import { vercelCollector } from "./vercel";

export * from "./types";
export { awsCollector, openaiCollector, vercelCollector };

const defaultCollectors: CostCollector[] = [
  vercelCollector,
  openaiCollector,
  awsCollector,
];

export async function runCollectors(input: {
  workspaceSlug: string;
  collectors?: CostCollector[];
}): Promise<CollectorResult[]> {
  const list = input.collectors ?? defaultCollectors;
  return Promise.all(
    list.map((c) => c.collect({ workspaceSlug: input.workspaceSlug })),
  );
}
