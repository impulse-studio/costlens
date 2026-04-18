import { collectorFetchSignal } from "./fetch-timeout";
import type { CostCollector, CostLineDraft } from "./types";

type NeonMetric = { metric_name?: string; value?: number };

type NeonConsumptionSlice = {
  timeframe_start?: string;
  timeframe_end?: string;
  metrics?: NeonMetric[];
};

type NeonPeriod = {
  period_plan?: string;
  consumption?: NeonConsumptionSlice[];
};

type NeonProjectPayload = {
  project_id?: string;
  periods?: NeonPeriod[];
};

type NeonConsumptionPage = {
  projects?: NeonProjectPayload[];
  pagination?: { cursor?: string };
};

const NEON_METRICS = [
  "compute_unit_seconds",
  "root_branch_bytes_month",
  "child_branch_bytes_month",
  "instant_restore_bytes_month",
  "public_network_transfer_bytes",
  "private_network_transfer_bytes",
  "extra_branches_month",
] as const;

const GB = 1_000_000_000;
const HOURS_IN_BILLING_MONTH = 744;

function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

function byteHoursToGbMonths(value: number): number {
  return value / HOURS_IN_BILLING_MONTH / GB;
}

function branchHoursToBranchMonths(value: number): number {
  return value / HOURS_IN_BILLING_MONTH;
}

function planFromEnv(): "launch" | "scale" | null {
  const raw = process.env.NEON_PLAN?.trim().toLowerCase();
  if (!raw) {
    return null;
  }
  if (raw === "scale" || raw === "agent" || raw === "enterprise") {
    return "scale";
  }
  return "launch";
}

function inferPlanFromPayload(projects: NeonProjectPayload[]): "launch" | "scale" {
  for (const p of projects) {
    for (const period of p.periods ?? []) {
      const key = (period.period_plan ?? "").toLowerCase();
      if (
        key === "scale" ||
        key === "agent" ||
        key === "enterprise"
      ) {
        return "scale";
      }
    }
  }
  return "launch";
}

function ratesFor(plan: "launch" | "scale") {
  if (plan === "scale") {
    return {
      computePerCuHr: 0.222,
      storagePerGbMo: 0.35,
      instantRestorePerGbMo: 0.2,
      publicPerGb: 0.1,
      privatePerGb: 0.01,
      branchesPerMo: 1.5,
    };
  }
  return {
    computePerCuHr: 0.106,
    storagePerGbMo: 0.35,
    instantRestorePerGbMo: 0.2,
    publicPerGb: 0.1,
    privatePerGb: 0,
    branchesPerMo: 1.5,
  };
}

function aggregateByProject(
  projects: NeonProjectPayload[],
): Map<string, Record<string, number>> {
  const byProject = new Map<string, Record<string, number>>();
  for (const proj of projects) {
    const pid = proj.project_id?.trim();
    if (!pid) {
      continue;
    }
    const acc =
      byProject.get(pid) ??
      Object.fromEntries(NEON_METRICS.map((m) => [m, 0])) as Record<
        (typeof NEON_METRICS)[number],
        number
      >;
    for (const period of proj.periods ?? []) {
      for (const slice of period.consumption ?? []) {
        for (const row of slice.metrics ?? []) {
          const name = row.metric_name;
          const v = row.value;
          if (!name || typeof v !== "number" || !Number.isFinite(v)) {
            continue;
          }
          if ((NEON_METRICS as readonly string[]).includes(name)) {
            acc[name as (typeof NEON_METRICS)[number]] =
              (acc[name as (typeof NEON_METRICS)[number]] ?? 0) + v;
          }
        }
      }
    }
    byProject.set(pid, acc);
  }
  return byProject;
}

export const neonCollector: CostCollector = {
  id: "neon",
  async collect({ workspaceSlug }) {
    const apiKey = process.env.NEON_API_KEY?.trim();
    const orgId = process.env.NEON_ORG_ID?.trim();
    if (!apiKey || !orgId) {
      return { provider: "neon", items: [] };
    }

    const to = new Date();
    const fromMs = Math.max(
      Date.UTC(2024, 2, 1),
      to.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    const from = new Date(fromMs);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    const periodLabel = `Last 30 days (${fromIso.slice(0, 10)} → ${toIso.slice(0, 10)})`;

    const metricsParam = NEON_METRICS.join(",");
    const collected: NeonProjectPayload[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 50; page += 1) {
      const params = new URLSearchParams({
        from: fromIso,
        to: toIso,
        granularity: "daily",
        org_id: orgId,
        metrics: metricsParam,
        limit: "100",
      });
      if (cursor) {
        params.set("cursor", cursor);
      }
      const res = await fetch(
        `https://console.neon.tech/api/v2/consumption_history/v2/projects?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          signal: collectorFetchSignal(),
        },
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          provider: "neon",
          items: [],
          errorMessage: `Neon consumption failed (${res.status}): ${errText.slice(0, 400)}`,
        };
      }
      const json = (await res.json()) as NeonConsumptionPage;
      const chunk = json.projects ?? [];
      collected.push(...chunk);
      const next = json.pagination?.cursor?.trim();
      if (!next || chunk.length === 0) {
        break;
      }
      cursor = next;
    }

    const plan = planFromEnv() ?? inferPlanFromPayload(collected);
    const rates = ratesFor(plan);

    const byProject = aggregateByProject(collected);
    let orgPublicBytes = 0;
    for (const m of byProject.values()) {
      orgPublicBytes += m.public_network_transfer_bytes ?? 0;
    }

    const items: CostLineDraft[] = [];

    for (const [projectId, m] of byProject) {
      const cuSeconds = m.compute_unit_seconds ?? 0;
      if (cuSeconds > 0) {
        const cuHours = cuSeconds / 3600;
        const usd = cuHours * rates.computePerCuHr;
        items.push({
          provider: "neon",
          service: "Neon compute (estimated)",
          amountCents: dollarsToCents(usd),
          currency: "USD",
          periodLabel,
          externalRef: `neon:${workspaceSlug}:project:${projectId}:compute`,
          metadata: {
            neonProjectId: projectId,
            computeUnitSeconds: cuSeconds,
            neonPlan: plan,
            neonEstimate: "launch_scale_public_rates",
          },
        });
      }

      const rootGbMo = byteHoursToGbMonths(m.root_branch_bytes_month ?? 0);
      if (rootGbMo > 0) {
        items.push({
          provider: "neon",
          service: "Neon root branch storage (estimated)",
          amountCents: dollarsToCents(rootGbMo * rates.storagePerGbMo),
          currency: "USD",
          periodLabel,
          externalRef: `neon:${workspaceSlug}:project:${projectId}:root_storage`,
          metadata: {
            neonProjectId: projectId,
            rootBranchBytesMonth: m.root_branch_bytes_month ?? 0,
            gbMonths: rootGbMo,
            neonPlan: plan,
          },
        });
      }

      const childGbMo = byteHoursToGbMonths(m.child_branch_bytes_month ?? 0);
      if (childGbMo > 0) {
        items.push({
          provider: "neon",
          service: "Neon child branch storage (estimated)",
          amountCents: dollarsToCents(childGbMo * rates.storagePerGbMo),
          currency: "USD",
          periodLabel,
          externalRef: `neon:${workspaceSlug}:project:${projectId}:child_storage`,
          metadata: {
            neonProjectId: projectId,
            childBranchBytesMonth: m.child_branch_bytes_month ?? 0,
            gbMonths: childGbMo,
            neonPlan: plan,
          },
        });
      }

      const pitrGbMo = byteHoursToGbMonths(m.instant_restore_bytes_month ?? 0);
      if (pitrGbMo > 0) {
        items.push({
          provider: "neon",
          service: "Neon instant restore / PITR storage (estimated)",
          amountCents: dollarsToCents(pitrGbMo * rates.instantRestorePerGbMo),
          currency: "USD",
          periodLabel,
          externalRef: `neon:${workspaceSlug}:project:${projectId}:instant_restore`,
          metadata: {
            neonProjectId: projectId,
            instantRestoreBytesMonth: m.instant_restore_bytes_month ?? 0,
            gbMonths: pitrGbMo,
            neonPlan: plan,
          },
        });
      }

      const privateGb = (m.private_network_transfer_bytes ?? 0) / GB;
      if (privateGb > 0 && rates.privatePerGb > 0) {
        items.push({
          provider: "neon",
          service: "Neon private network transfer (estimated)",
          amountCents: dollarsToCents(privateGb * rates.privatePerGb),
          currency: "USD",
          periodLabel,
          externalRef: `neon:${workspaceSlug}:project:${projectId}:private_transfer`,
          metadata: {
            neonProjectId: projectId,
            privateNetworkTransferBytes: m.private_network_transfer_bytes ?? 0,
            neonPlan: plan,
          },
        });
      }

      const branchMo = branchHoursToBranchMonths(m.extra_branches_month ?? 0);
      if (branchMo > 0) {
        items.push({
          provider: "neon",
          service: "Neon extra branches (estimated, allowance not applied)",
          amountCents: dollarsToCents(branchMo * rates.branchesPerMo),
          currency: "USD",
          periodLabel,
          externalRef: `neon:${workspaceSlug}:project:${projectId}:extra_branches`,
          metadata: {
            neonProjectId: projectId,
            extraBranchesMonth: m.extra_branches_month ?? 0,
            branchMonths: branchMo,
            neonPlan: plan,
            neonEstimate: "extra_branches_ignores_included_allowance",
          },
        });
      }
    }

    const publicGb = orgPublicBytes / GB;
    const billablePublicGb = Math.max(0, publicGb - 100);
    if (billablePublicGb > 0) {
      items.push({
        provider: "neon",
        service: "Neon public network transfer (estimated, org-wide)",
        amountCents: dollarsToCents(billablePublicGb * rates.publicPerGb),
        currency: "USD",
        periodLabel,
        externalRef: `neon:${workspaceSlug}:org:public_transfer`,
        metadata: {
          publicNetworkTransferBytes: orgPublicBytes,
          billableGb: billablePublicGb,
          freeAllowanceGb: 100,
          neonPlan: plan,
        },
      });
    }

    return { provider: "neon", items };
  },
};
