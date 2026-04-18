import type { CostCollector } from "./types";

export const awsCollector: CostCollector = {
  id: "aws",
  async collect({ workspaceSlug }) {
    return {
      provider: "aws",
      items: [
        {
          provider: "aws",
          service: "Amazon RDS",
          amountCents: 128_90,
          currency: "USD",
          periodLabel: "Last 30 days (sample)",
          externalRef: `aws:rds:${workspaceSlug}`,
          metadata: { engine: "postgres", sample: true },
        },
        {
          provider: "aws",
          service: "AWS Lambda",
          amountCents: 410,
          currency: "USD",
          periodLabel: "Last 30 days (sample)",
          externalRef: `aws:lambda:${workspaceSlug}`,
          metadata: { sample: true },
        },
      ],
    };
  },
};
