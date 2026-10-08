// Rate limit en memoria por clave (IP). Suficiente para un solo contenedor;
// si se escala a varias instancias habría que moverlo a Redis/Supabase.

const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  // Limpieza ocasional para que el Map no crezca indefinidamente
  if (hits.size > 10000) {
    for (const [k, times] of hits) {
      if (!times.some((t) => now - t < windowMs)) hits.delete(k);
    }
  }
  return false;
}

// En producción nginx fija X-Real-IP = $remote_addr (no falsificable por el cliente).
// X-Forwarded-For solo como respaldo (el primer valor lo puede inventar el cliente).
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}
