export type CostProviderId = "vercel" | "openai" | "anthropic" | "neon";

export type CollectorContext = {
  workspaceSlug: string;
  vercelProjectId?: string | null;
};

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
  collect: (input: CollectorContext) => Promise<CollectorResult>;
};
