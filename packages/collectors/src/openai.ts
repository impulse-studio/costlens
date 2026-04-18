import type { CostCollector } from "./types";

export const openaiCollector: CostCollector = {
  id: "openai",
  async collect({ workspaceSlug }) {
    return {
      provider: "openai",
      items: [
        {
          provider: "openai",
          service: "Chat Completions",
          amountCents: 4920,
          currency: "USD",
          periodLabel: "Last 30 days (sample)",
          externalRef: `openai:completions:${workspaceSlug}`,
          metadata: { model: "gpt-4.1-mini", sample: true },
        },
      ],
    };
  },
};
