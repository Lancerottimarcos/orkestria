type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Paliativo em memória (sem Redis) - não sobrevive a um restart nem escala
// pra múltiplas instâncias, mas cobre o cenário real de hoje (processo único
// via PM2) contra tentativa ilimitada de senha/token em endpoints públicos.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  },
  10 * 60 * 1000,
).unref();

/** true se `key` já estourou `limit` tentativas na janela de `windowMs`. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

/** IP do cliente a partir dos headers do proxy reverso (nginx na frente do Next). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
