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
  return Promise.all(
    list.map(async (c) => {
      try {
        return await c.collect(ctx);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          provider: c.id,
          items: [],
          errorMessage: `Collector failed: ${msg.slice(0, 400)}`,
        };
      }
    }),
  );
}
