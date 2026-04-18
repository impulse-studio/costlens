import type { CostCollector } from "./types";

export const awsCollector: CostCollector = {
  id: "aws",
  async collect() {
    return { provider: "aws", items: [] };
  },
};
