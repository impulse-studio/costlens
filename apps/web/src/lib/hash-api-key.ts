export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function apiKeyDisplayPrefix(apiKey: string): string {
  const t = apiKey.trim();
  if (t.length <= 12) {
    return t;
  }
  return `${t.slice(0, 8)}…${t.slice(-4)}`;
}
