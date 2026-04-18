import { collectorFetchSignal } from "./fetch-timeout";
import type { CostCollector, CostLineDraft } from "./types";

type VercelFocusRow = {
  BilledCost?: number;
  EffectiveCost?: number;
  BillingCurrency?: string;
  ChargeCategory?: string;
  ServiceName?: string;
  Tags?: Record<string, string | undefined>;
  ChargePeriodStart?: string;
  ChargePeriodEnd?: string;
};

function tagProjectId(tags: Record<string, string | undefined> | undefined) {
  if (!tags) {
    return undefined;
  }
  return (
    tags.ProjectId ??
    tags.project_id ??
    tags["vercel/project-id"] ??
    tags.projectId
  );
}

function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

async function resolveVercelTeamId(
  token: string,
): Promise<{ teamId: string } | { error: string }> {
  const fromEnv = process.env.VERCEL_TEAM_ID?.trim();
  if (fromEnv) {
    return { teamId: fromEnv };
  }
  const res = await fetch("https://api.vercel.com/v2/teams?limit=20", {
    headers: { Authorization: `Bearer ${token}` },
    signal: collectorFetchSignal(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      error: `Vercel team list failed (${res.status}): ${body.slice(0, 400)}`,
    };
  }
  const json = (await res.json()) as { teams?: { id: string }[] };
  const id = json.teams?.[0]?.id;
  if (!id) {
    return { error: "No Vercel teams found for this token." };
  }
  return { teamId: id };
}

function parseJsonl(body: string): VercelFocusRow[] {
  const rows: VercelFocusRow[] = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t) {
      continue;
    }
    try {
      rows.push(JSON.parse(t) as VercelFocusRow);
    } catch {
      continue;
    }
  }
  return rows;
}

export const vercelCollector: CostCollector = {
  id: "vercel",
  async collect({ workspaceSlug, vercelProjectId }) {
    const token = process.env.VERCEL_TOKEN?.trim();
    if (!token) {
      return { provider: "vercel", items: [] };
    }

    const team = await resolveVercelTeamId(token);
    if ("error" in team) {
      return { provider: "vercel", items: [], errorMessage: team.error };
    }

    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    const periodLabel = `Last 30 days (${fromIso.slice(0, 10)} → ${toIso.slice(0, 10)})`;

    const params = new URLSearchParams({
      from: fromIso,
      to: toIso,
      teamId: team.teamId,
    });
    const res = await fetch(
      `https://api.vercel.com/v1/billing/charges?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/jsonl",
          "Accept-Encoding": "gzip",
        },
        signal: collectorFetchSignal(),
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        provider: "vercel",
        items: [],
        errorMessage: `Vercel billing charges failed (${res.status}): ${errText.slice(0, 400)}`,
      };
    }

    const text = await res.text();
    const parsed = parseJsonl(text);
    const projectFilter = vercelProjectId?.trim() || null;

    const totalsUsd = new Map<string, number>();
    for (const row of parsed) {
      if (row.ChargeCategory && row.ChargeCategory !== "Usage") {
        continue;
      }
      const pid = tagProjectId(row.Tags);
      if (projectFilter && pid && pid !== projectFilter) {
        continue;
      }
      if (projectFilter && !pid) {
        continue;
      }
      const name = row.ServiceName?.trim() || "Vercel";
      const cost = row.BilledCost ?? row.EffectiveCost ?? 0;
      if (!Number.isFinite(cost) || cost === 0) {
        continue;
      }
      totalsUsd.set(name, (totalsUsd.get(name) ?? 0) + cost);
    }

    const items: CostLineDraft[] = [];
    for (const [service, usd] of totalsUsd) {
      items.push({
        provider: "vercel",
        service,
        amountCents: dollarsToCents(usd),
        currency: "USD",
        periodLabel,
        externalRef: `vercel:${service}:${workspaceSlug}`,
        metadata: {
          source: "vercel_billing_charges_v1",
          teamId: team.teamId,
          ...(projectFilter ? { vercelProjectId: projectFilter } : {}),
        },
      });
    }

    return { provider: "vercel", items };
  },
};
