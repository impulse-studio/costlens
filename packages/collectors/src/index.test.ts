import { describe, expect, it } from "vitest";

import { runCollectors } from "./index";

describe("runCollectors", () => {
  it("returns sample lines for each provider", async () => {
    const rows = await runCollectors({ workspaceSlug: "demo" });
    expect(rows).toHaveLength(3);
    const total = rows.flatMap((r) => r.items).length;
    expect(total).toBeGreaterThan(0);
  });
});
