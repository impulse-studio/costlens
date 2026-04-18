import type { CostCollector, CostLineDraft } from "./types";

type CacheCreation = {
  ephemeral_1h_input_tokens?: number;
  ephemeral_5m_input_tokens?: number;
};

type MessagesRow = {
  model?: string | null;
  api_key_id?: string | null;
  uncached_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: CacheCreation;
  output_tokens?: number;
};

type MessagesBucket = {
  starting_at?: string;
  ending_at?: string;
  results?: MessagesRow[];
};

type MessagesPage = {
  data?: MessagesBucket[];
  has_more?: boolean;
  next_page?: string | null;
};

function inputTokens(r: MessagesRow): number {
  const cc = r.cache_creation ?? {};
  return (
    (r.uncached_input_tokens ?? 0) +
    (r.cache_read_input_tokens ?? 0) +
    (cc.ephemeral_1h_input_tokens ?? 0) +
    (cc.ephemeral_5m_input_tokens ?? 0)
  );
}

function anthropicRatesPerMillion(model: string | undefined): {
  inputUsd: number;
  outputUsd: number;
} {
  const m = (model ?? "").toLowerCase();
  if (m.includes("haiku")) {
    return { inputUsd: 0.25, outputUsd: 1.25 };
  }
  if (m.includes("sonnet")) {
    return { inputUsd: 3, outputUsd: 15 };
  }
  if (m.includes("opus")) {
    return { inputUsd: 15, outputUsd: 75 };
  }
  return { inputUsd: 3, outputUsd: 15 };
}

function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

function rangeIso30d(): { start: string; end: string; label: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `Last 30 days (${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)})`,
  };
}

export const anthropicCollector: CostCollector = {
  id: "anthropic",
  async collect({ workspaceSlug }) {
    const key = process.env.ANTHROPIC_ADMIN_KEY?.trim();
    if (!key) {
      return { provider: "anthropic", items: [] };
    }

    const { start, end, label: periodLabel } = rangeIso30d();

    const aggregated = new Map<
      string,
      { model: string; apiKeyId: string | null; inTok: number; outTok: number }
    >();

    let page: string | null | undefined;
    let guard = 0;
    while (guard < 40) {
      guard += 1;
      const params = new URLSearchParams({
        starting_at: start,
        ending_at: end,
        bucket_width: "1d",
        limit: "31",
      });
      params.append("group_by", "model");
      params.append("group_by", "api_key_id");
      if (page) {
        params.set("page", page);
      }

      const res = await fetch(
        `https://api.anthropic.com/v1/organizations/usage_report/messages?${params.toString()}`,
        {
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
        },
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          provider: "anthropic",
          items: [],
          errorMessage: `Anthropic usage failed (${res.status}): ${errText.slice(0, 400)}`,
        };
      }

      const json = (await res.json()) as MessagesPage;
      for (const bucket of json.data ?? []) {
        for (const row of bucket.results ?? []) {
          const model = row.model ?? "unknown";
          const apiKeyId = row.api_key_id ?? null;
          const aggKey = `${model}::${apiKeyId ?? "none"}`;
          const prev = aggregated.get(aggKey) ?? {
            model,
            apiKeyId,
            inTok: 0,
            outTok: 0,
          };
          prev.inTok += inputTokens(row);
          prev.outTok += row.output_tokens ?? 0;
          aggregated.set(aggKey, prev);
        }
      }

      if (!json.has_more || !json.next_page) {
        break;
      }
      page = json.next_page;
    }

    const items: CostLineDraft[] = [];
    for (const { model, apiKeyId, inTok, outTok } of aggregated.values()) {
      if (inTok === 0 && outTok === 0) {
        continue;
      }
      const rates = anthropicRatesPerMillion(model);
      const usd =
        (inTok / 1_000_000) * rates.inputUsd + (outTok / 1_000_000) * rates.outputUsd;
      const prefix = apiKeyId ? apiKeyId.slice(0, 12) : "unknown";
      items.push({
        provider: "anthropic",
        service: `Messages (${model})`,
        amountCents: dollarsToCents(usd),
        currency: "USD",
        periodLabel,
        externalRef: `anthropic:${workspaceSlug}:key:${prefix}:${model}`,
        metadata: {
          model,
          apiKeyPrefix: prefix,
          inputTokens: inTok,
          outputTokens: outTok,
        },
      });
    }

    return { provider: "anthropic", items };
  },
};
