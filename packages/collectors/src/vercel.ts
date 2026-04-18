import type { CostCollector } from "./types";

export const vercelCollector: CostCollector = {
  id: "vercel",
  async collect({ workspaceSlug }) {
    return {
      provider: "vercel",
      items: [
        {
          provider: "vercel",
          service: "Fluid compute",
          amountCents: 1840,
          currency: "USD",
          periodLabel: "Last 30 days (sample)",
          externalRef: `vercel:fluid:${workspaceSlug}`,
          metadata: { region: "iad1", sample: true },
        },
        {
          provider: "vercel",
          service: "Blob storage",
          amountCents: 320,
          currency: "USD",
          periodLabel: "Last 30 days (sample)",
          externalRef: `vercel:blob:${workspaceSlug}`,
          metadata: { sample: true },
        },
      ],
    };
  },
};
