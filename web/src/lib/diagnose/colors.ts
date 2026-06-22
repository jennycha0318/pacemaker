// 점수/플랜 톤 색 + 배지 문구 — Report·HistoryList·ShareButton 공용 (파스텔 good/warn/bad)
export const TONE = { good: "#4fa3a2", warn: "#c79a4e", bad: "#b96b8f" } as const;

export function scoreColor(score: number): string {
  return score >= 65 ? TONE.good : score >= 45 ? TONE.warn : TONE.bad;
}

export function scoreBadge(score: number): string {
  return score >= 65 ? "지금이 좋은 타이밍" : score >= 45 ? "조금 더 준비가 필요" : "지금은 기다릴 때";
}

export function toneColor(tone: "good" | "warn" | "bad"): string {
  return TONE[tone];
}
