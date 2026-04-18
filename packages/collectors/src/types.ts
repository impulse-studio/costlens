export type CostProviderId = "vercel" | "openai" | "aws";

export type CostLineDraft = {
  projectId?: string;
  provider: CostProviderId;
  service: string;
  amountCents: number;
  currency: string;
  periodLabel: string;
  externalRef?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type CollectorResult = {
  provider: CostProviderId;
  items: CostLineDraft[];
  errorMessage?: string;
};

export type CostCollector = {
  id: CostProviderId;
  collect: (input: { workspaceSlug: string }) => Promise<CollectorResult>;
};
