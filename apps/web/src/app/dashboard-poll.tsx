"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INTERVAL_MS = 45_000;

type CostsPayload = {
  grandTotalCents: number;
  lines: { id: string }[];
  runs: { id: string }[];
};

function fingerprint(data: CostsPayload): string {
  return [
    data.grandTotalCents,
    data.lines[0]?.id ?? "",
    data.runs[0]?.id ?? "",
    data.lines.length,
  ].join(":");
}

export function DashboardPoll() {
  const router = useRouter();
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/costs", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = (await res.json()) as CostsPayload;
        const fp = fingerprint(data);
        if (prev.current !== null && fp !== prev.current) {
          router.refresh();
        }
        prev.current = fp;
        if (!cancelled) {
          setLastAt(new Date().toISOString());
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "poll failed");
        }
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);

  if (error) {
    return (
      <p className="text-xs text-rose-600" role="status">
        Cost snapshot poll failed: {error}
      </p>
    );
  }

  return (
    <p className="text-xs text-zinc-500" role="status">
      Live sync checks <code className="rounded bg-zinc-100 px-1">/api/costs</code> every{" "}
      {INTERVAL_MS / 1000}s and refreshes the page when totals or rows change
      {lastAt ? ` · last check ${lastAt}` : ""}.
    </p>
  );
}
