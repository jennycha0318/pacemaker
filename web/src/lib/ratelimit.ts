// 서버리스 인스턴스별 in-memory 슬라이딩 윈도우 rate limit — API 남용(단일 IP 스크립트 난사) 1차 방어선.
// 한계(정직하게): 인스턴스마다 카운터가 따로고 콜드스타트에 리셋됨 → 완전한 방어가 아님.
// F&F 베타 규모에선 충분하며, 확장 시 외부 스토어(Upstash 등) 기반으로 교체.
const buckets = new Map<string, number[]>();

/** key당 windowMs 안에 limit회까지 허용. 초과면 false. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // 메모리 방어 — 버킷이 쌓이면 만료된 키 정리
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

/** Vercel/프록시 뒤에서 클라이언트 IP 추출(x-forwarded-for 첫 항목). */
export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return xf ? xf.split(",")[0].trim() : (req.headers.get("x-real-ip") ?? "unknown");
}
