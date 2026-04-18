import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveSqliteDatabaseFile(): string {
  const explicitPath = process.env.COSTLENS_DATABASE_PATH?.trim();
  if (explicitPath) {
    return path.isAbsolute(explicitPath)
      ? explicitPath
      : path.join(/* turbopackIgnore: true */ process.cwd(), explicitPath);
  }

  const url = (
    process.env.COSTLENS_DATABASE_URL ?? process.env.DATABASE_URL
  )?.trim();
  if (url) {
    if (url.startsWith("file:")) {
      const rest = url.slice("file:".length);
      if (rest.startsWith("//")) {
        return fileURLToPath(new URL(url));
      }
      const relative = rest.replace(/^\/+/, "");
      return path.resolve(/* turbopackIgnore: true */ process.cwd(), relative);
    }
    return path.isAbsolute(url)
      ? url
      : path.resolve(/* turbopackIgnore: true */ process.cwd(), url);
  }

  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "..",
    "..",
    "data",
    "costlens.db",
  );
}
