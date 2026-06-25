// 자유서술(freeText) 결과 반영 — LLM 없이 "결정적 키워드 레이어"로 점수·근거에 반영.
// SAFETY 신호는 needsSupport=true로 상담 연결을 유도하고, 일반 신호는 작은 delta factor로 점수에 자연 반영한다.
import type { Factor } from "./engine"; // Factor = { label: string; delta: number }

export interface FreeTextSignal {
  factors: Factor[];
  needsSupport: boolean;
}

// 정서/안전 위기 신호 — 매치 시 needsSupport=true (점수 미반영, 상담 연결 우선)
const SAFETY: RegExp[] = [
  /자살/,
  /죽고\s*싶|죽고싶/,
  /자해/,
  /사라지고\s*싶/,
  /때리|때렸|폭행|폭력|맞았/,
  /협박|위협/,
  /감금|가뒀|가두/,
  /스토킹/,
  // 강압적 통제·정서적 학대(coercive control) — 물리폭력 외에도 needsSupport로 상담 연결
  /연락\s*(을|를)?\s*못\s*하게|연락\s*(을|를)?\s*막|연락\s*금지|못\s*만나게/,
  /친구\s*(를|을)?\s*못\s*만나|가족\s*(을|를)?\s*못\s*만나|만나지\s*말라/,
  /욕설|폭언|모욕|쌍욕/,
  /가스라이팅|조종당|세뇌|조종하려/,
  /감시당|위치\s*추적|몰래\s*확인|폰을?\s*뒤|휴대폰을?\s*뒤|핸드폰을?\s*뒤/,
  /강압|위협적|강제로\s*시/,
];

// 신호 키워드 — 매치 시 작은 delta의 factor 추가 (label은 "적어주신 내용: …")
const SIGNALS: { re: RegExp; delta: number; label: string }[] = [
  { re: /차단/, delta: -6, label: "적어주신 내용: ‘차단’ 언급" },
  { re: /잠수|읽씹|답장\s*없|답이\s*없|연락\s*두절/, delta: -5, label: "적어주신 내용: 무응답·잠수 신호" },
  { re: /새\s*(사람|애인|여자친구|남자친구)|새로운\s*사람|환승|바람|양다리/, delta: -6, label: "적어주신 내용: 상대의 새 관계 가능성" },
  { re: /집착|매일\s*연락|계속\s*연락|하루\s*종일|매달리/, delta: -4, label: "적어주신 내용: 과한 연락·집착 신호" },
  { re: /먼저\s*연락\s*(왔|옴|이\s*왔)|먼저\s*연락해/, delta: 5, label: "적어주신 내용: 상대가 먼저 연락" },
];

export function analyzeFreeText(text?: string): FreeTextSignal {
  const t = (text || "").trim();
  if (!t) return { factors: [], needsSupport: false };

  const needsSupport = SAFETY.some((re) => re.test(t));

  const factors: Factor[] = [];
  for (const s of SIGNALS) {
    if (s.re.test(t)) factors.push({ label: s.label, delta: s.delta });
  }

  return {
    factors: factors.filter((x) => x.delta !== 0).slice(0, 3),
    needsSupport,
  };
}
