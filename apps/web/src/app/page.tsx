import { desc, eq, sql } from "drizzle-orm";

import { collectorRun, costLineItem } from "@costlens/database";

import { CollectButton } from "./collect-button";
import { DashboardPoll } from "./dashboard-poll";
import { appConfig } from "./app.config";
import { getDb } from "@/lib/db";
import { DEFAULT_WORKSPACE_SLUG, ensureWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function HomePage() {
  const db = getDb();
  const ws = await ensureWorkspace(db, DEFAULT_WORKSPACE_SLUG);

  const totals = await db
    .select({
      provider: costLineItem.provider,
      totalCents: sql<number>`coalesce(sum(${costLineItem.amountCents}), 0)`,
    })
    .from(costLineItem)
    .where(eq(costLineItem.workspaceId, ws.id))
    .groupBy(costLineItem.provider);

  const lines = await db
    .select()
    .from(costLineItem)
    .where(eq(costLineItem.workspaceId, ws.id))
    .orderBy(desc(costLineItem.collectedAt))
    .limit(25);

  const runs = await db
    .select()
    .from(collectorRun)
    .where(eq(collectorRun.workspaceId, ws.id))
    .orderBy(desc(collectorRun.startedAt))
    .limit(8);

  const grandTotal = totals.reduce((acc, row) => acc + Number(row.totalCents), 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {appConfig.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
            Cost overview
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            {appConfig.description} — Vercel, OpenAI, Anthropic, and Neon collectors
            call live provider APIs when server credentials are set; otherwise they
            return no rows.
          </p>
        </div>
        <CollectButton />
      </header>

      <div className="mt-4 space-y-2">
        <DashboardPoll />
        <p className="text-xs text-zinc-500">
          Background ingest: set <code className="rounded bg-zinc-100 px-1">COSTLENS_POLL_SECRET</code> then
          call <code className="rounded bg-zinc-100 px-1">GET /api/poll</code> or{" "}
          <code className="rounded bg-zinc-100 px-1">POST /api/poll</code> with{" "}
          <code className="rounded bg-zinc-100 px-1">Authorization: Bearer …</code> or header{" "}
          <code className="rounded bg-zinc-100 px-1">x-costlens-secret</code>.
        </p>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-500">
            All providers
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-950">
            {formatUsd(grandTotal)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Stored line items</p>
        </div>
        {totals.map((row) => (
          <div
            key={row.provider}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase text-zinc-500">
              {row.provider}
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatUsd(Number(row.totalCents))}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Recent line items</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Provider</th>
                  <th className="px-4 py-2">Service</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      No data yet. Run collectors after configuring provider keys in
                      the server environment.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2 font-medium text-zinc-800">
                        {line.provider}
                      </td>
                      <td className="px-4 py-2 text-zinc-600">{line.service}</td>
                      <td className="px-4 py-2 text-zinc-500">{line.periodLabel}</td>
                      <td className="px-4 py-2 text-right font-medium text-zinc-900">
                        {formatUsd(line.amountCents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Collector runs</h2>
          <ul className="mt-3 space-y-2">
            {runs.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500">
                No runs recorded yet.
              </li>
            ) : (
              runs.map((run) => (
                <li
                  key={run.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-medium text-zinc-900">{run.provider}</p>
                    <p className="text-xs text-zinc-500">
                      {run.status} · {run.itemCount} items
                    </p>
                    {run.errorMessage ? (
                      <p className="mt-1 break-words text-xs text-rose-700">
                        {run.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={
                      run.status === "ok"
                        ? "text-xs font-medium text-emerald-700"
                        : "text-xs font-medium text-rose-700"
                    }
                  >
                    {run.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
