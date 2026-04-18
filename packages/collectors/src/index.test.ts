import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runCollectors } from "./index";

const ENV_KEYS = [
  "VERCEL_TOKEN",
  "VERCEL_TEAM_ID",
  "OPENAI_ADMIN_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_ADMIN_KEY",
  "ANTHROPIC_API_KEY",
  "NEON_API_KEY",
  "NEON_ORG_ID",
  "NEON_PLAN",
] as const;

describe("runCollectors", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> =
    {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = saved[k];
      }
    }
  });

  it("runs four collectors and never emits sample metadata", async () => {
    const rows = await runCollectors({ workspaceSlug: "demo" });
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.provider).sort()).toEqual(
      ["anthropic", "neon", "openai", "vercel"].sort(),
    );
    for (const r of rows) {
      for (const item of r.items) {
        expect(item.metadata?.sample).not.toBe(true);
      }
    }
    expect(rows.find((r) => r.provider === "neon")?.items).toEqual([]);
  });
});
