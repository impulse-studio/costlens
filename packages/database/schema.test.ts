import { describe, expect, it } from "vitest";

import {
  apiKeyProjectMapping,
  costLineItem,
  oidcProjectMapping,
  project,
} from "./src/schema";

describe("CostLens schema", () => {
  it("defines the project attribution tables", () => {
    expect(project.workspaceId.name).toBe("workspace_id");
    expect(project.slug.name).toBe("slug");

    expect(apiKeyProjectMapping.projectId.name).toBe("project_id");
    expect(apiKeyProjectMapping.apiKeyHash.name).toBe("api_key_hash");

    expect(oidcProjectMapping.projectId.name).toBe("project_id");
    expect(oidcProjectMapping.oidcSub.name).toBe("oidc_sub");
  });

  it("keeps cost line items optionally linked to a project", () => {
    expect(costLineItem.projectId.name).toBe("project_id");
  });
});
