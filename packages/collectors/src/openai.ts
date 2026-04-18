import type { CostCollector, CostLineDraft } from "./types";

type UsageRow = {
  object?: string;
  input_tokens?: number;
  output_tokens?: number;
  model?: string | null;
  api_key_id?: string | null;
};

type UsageBucket = {
  start_time?: number;
  end_time?: number;
  result?: UsageRow[];
  results?: UsageRow[];
};

type UsagePage = {
  data?: UsageBucket[];
  has_more?: boolean;
  next_page?: string | null;
};

function bucketRows(b: UsageBucket): UsageRow[] {
  return b.result ?? b.results ?? [];
}

function openAiRatesPerMillion(model: string | undefined): {
  inputUsd: number;
  outputUsd: number;
} | null {
  const m = (model ?? "").toLowerCase();
  if (m.includes("gpt-4o-mini")) {
    return { inputUsd: 0.15, outputUsd: 0.6 };
  }
  if (m.includes("gpt-4o") && !m.includes("mini")) {
    return { inputUsd: 5, outputUsd: 15 };
  }
  if (m.includes("gpt-4.1-mini")) {
    return { inputUsd: 0.15, outputUsd: 0.6 };
  }
  if (m.startsWith("gpt-")) {
    return { inputUsd: 5, outputUsd: 15 };
  }
  return null;
}

function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

export const openaiCollector: CostCollector = {
  id: "openai",
  async collect({ workspaceSlug }) {
    const key =
      process.env.OPENAI_ADMIN_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      return { provider: "openai", items: [] };
    }

    const end = Math.floor(Date.now() / 1000);
    const start = end - 30 * 24 * 60 * 60;
    const periodLabel = `Last 30 days (${new Date(start * 1000).toISOString().slice(0, 10)} → ${new Date(end * 1000).toISOString().slice(0, 10)})`;

    const aggregated = new Map<
      string,
      { model: string; apiKeyId: string | null; inTok: number; outTok: number }
    >();

    let page: string | null | undefined;
    let guard = 0;
    while (guard < 40) {
      guard += 1;
      const params = new URLSearchParams({
        start_time: String(start),
        end_time: String(end),
        bucket_width: "1d",
        limit: "31",
      });
      params.append("group_by", "model");
      params.append("group_by", "api_key_id");
      if (page) {
        params.set("page", page);
      }

      const res = await fetch(
        `https://api.openai.com/v1/organization/usage/completions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          provider: "openai",
          items: [],
          errorMessage: `OpenAI usage failed (${res.status}): ${errText.slice(0, 400)}`,
        };
      }

      const json = (await res.json()) as UsagePage;
      for (const bucket of json.data ?? []) {
        for (const row of bucketRows(bucket)) {
          if (row.object !== "organization.usage.completions.result") {
            continue;
          }
          const model = row.model ?? "unknown";
          const apiKeyId = row.api_key_id ?? null;
          const keyAgg = `${model}::${apiKeyId ?? "none"}`;
          const prev = aggregated.get(keyAgg) ?? {
            model,
            apiKeyId,
            inTok: 0,
            outTok: 0,
          };
          prev.inTok += row.input_tokens ?? 0;
          prev.outTok += row.output_tokens ?? 0;
          aggregated.set(keyAgg, prev);
        }
      }

      if (!json.has_more || !json.next_page) {
        break;
      }
      page = json.next_page;
    }

    const items: CostLineDraft[] = [];
    for (const { model, apiKeyId, inTok, outTok } of aggregated.values()) {
      const rates = openAiRatesPerMillion(model);
      if (!rates || (inTok === 0 && outTok === 0)) {
        continue;
      }
      const usd =
        (inTok / 1_000_000) * rates.inputUsd + (outTok / 1_000_000) * rates.outputUsd;
      const prefix = apiKeyId ? apiKeyId.slice(0, 10) : "unknown";
      items.push({
        provider: "openai",
        service: `Chat completions (${model})`,
        amountCents: dollarsToCents(usd),
        currency: "USD",
        periodLabel,
        externalRef: `openai:key:${prefix}:${model}`,
        metadata: {
          model,
          apiKeyPrefix: prefix,
          inputTokens: inTok,
          outputTokens: outTok,
        },
      });
    }

    return { provider: "openai", items };
  },
};
