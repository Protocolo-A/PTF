const buckets = new Map<string, { count: number; expires: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.expires < now) buckets.delete(k);
  const entry = buckets.get(key);
  if (!entry || entry.expires < now) { buckets.set(key, { count: 1, expires: now + windowMs }); return true; }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}
export function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
