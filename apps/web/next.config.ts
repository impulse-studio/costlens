import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const nextConfigDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** CostLens workspace root (`costlens/`), so tracing includes `packages/*`. */
  outputFileTracingRoot: path.join(nextConfigDir, "../.."),
  transpilePackages: ["@costlens/database", "@costlens/collectors"],
};

export default nextConfig;
