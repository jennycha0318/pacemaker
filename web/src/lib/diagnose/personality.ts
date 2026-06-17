// 성향·궁합 "참고" 레이어 — MBTI/나이차는 점수에 반영하지 않고(낮은 신뢰도),
// 소통 톤 팁 + 가벼운 궁합 코멘트로만 활용한다. 핵심 판단은 규칙 엔진의 신호(애착·행동·맥락)가 담당.
import type { Answers } from "./engine";

export const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
];

export interface Compat {
  tips: string[];        // 상대 MBTI 기반 소통 팁 (참고)
  mbtiNote?: string;     // 궁합 한 줄 (참고)
  ageGapNote?: string;   // 나이차 한 줄 (참고)
}

function isMbti(s: string): boolean {
  return /^[EI][SN][TF][JP]$/.test(s);
}

// 상대 MBTI → 연락·메시지 톤 팁 (과장 없이, 우리 결과물 '언제·어떻게'와 연결)
function partnerTips(m: string): string[] {
  const t: string[] = [];
  t.push(m[0] === "E"
    ? "외향형(E) — 가볍고 잦은 안부 연락이 편안할 수 있어요."
    : "내향형(I) — 연락 빈도는 낮추고 혼자 생각할 시간을 존중하세요.");
  t.push(m[1] === "S"
    ? "감각형(S) — 두루뭉술한 말보다 구체적인 일정·사실로 제안하세요."
    : "직관형(N) — 의미·가능성, ‘우리 앞으로’ 같은 그림을 함께 그려보세요.");
  t.push(m[2] === "T"
    ? "사고형(T) — 감정 호소보다 간결하고 이유가 분명한 메시지가 잘 통해요."
    : "감정형(F) — 결론보다 공감·마음을 먼저 전하면 마음이 열려요.");
  t.push(m[3] === "J"
    ? "계획형(J) — 약속·만남은 미리 여유 있게 제안하세요."
    : "탐색형(P) — 빡빡한 계획보다 여지를 두는 가벼운 제안이 부담 없어요.");
  return t;
}

export function computePersonality(a: Answers): Compat | undefined {
  const myM = (a.myMbti || "").toUpperCase();
  const ptM = (a.partnerMbti || "").toUpperCase();
  const myY = a.myBirthYear ? parseInt(a.myBirthYear, 10) : NaN;
  const ptY = a.partnerBirthYear ? parseInt(a.partnerBirthYear, 10) : NaN;

  const tips = isMbti(ptM) ? partnerTips(ptM) : [];

  let mbtiNote: string | undefined;
  if (isMbti(myM) && isMbti(ptM)) {
    let shared = 0;
    for (let i = 0; i < 4; i++) if (myM[i] === ptM[i]) shared++;
    if (shared >= 3) mbtiNote = `${myM} × ${ptM} — 성향 코드가 잘 맞는 편이에요. 대화가 한결 편할 수 있어요.`;
    else if (shared === 2) mbtiNote = `${myM} × ${ptM} — 비슷한 점과 다른 점이 반반. 서로 배울 게 많은 조합이에요.`;
    else mbtiNote = `${myM} × ${ptM} — 성향 차이가 있는 편. 다름을 인정하면 오히려 서로를 보완해요.`;
  }

  let ageGapNote: string | undefined;
  if (!isNaN(myY) && !isNaN(ptY)) {
    const gap = Math.abs(myY - ptY);
    if (gap >= 10) ageGapNote = `나이차 약 ${gap}살 — 소통 방식·기대가 다를 수 있으니 서로 속도를 맞춰가세요.`;
    else if (gap >= 6) ageGapNote = `나이차 약 ${gap}살 — 표현 방식의 차이를 염두에 두면 좋아요.`;
  }

  if (!tips.length && !mbtiNote && !ageGapNote) return undefined;
  return { tips, mbtiNote, ageGapNote };
}
