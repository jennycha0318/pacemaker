import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { diagnose, type Answers, type Diagnosis } from "@/lib/diagnose/engine";
import { SURVEYS, STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 모델: 결과 해석은 Opus 4.8(고품질). 챗봇(추후)은 별도로 Sonnet 4.6 사용 예정.
const MODEL = "claude-opus-4-8";

// 구조화 출력 스키마 — 해석(interpretation)과 문구(message)만. 점수·타이밍은 규칙 엔진이 확정.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    interpretation: {
      type: "string",
      description: "사용자 상황에 대한 따뜻하고 정직한 해석 2~4문장 (규칙 결과와 일관되게)",
    },
    message: {
      type: "string",
      description: "상대에게 보낼 자연스러운 한국어 메시지 1개(2~5줄). 연락을 권하지 않는 상황이면 빈 문자열.",
    },
    selfMessage: {
      type: "string",
      description: "상대가 아니라 사용자 자신에게 건네는 따뜻한 위로·다짐 한마디. 특히 연락을 권하지 않는 보류·차단·안전 상황에서 2~3줄로 꼭 채울 것.",
    },
  },
  required: ["interpretation", "message", "selfMessage"],
  additionalProperties: false,
} as const;

function isStage(s: unknown): s is Stage {
  return s === "crush" || s === "unrequited" || s === "dating" || s === "breakup";
}

// 규칙 결과로 폴백(키 미설정·오류·거부·학대 케이스)
function fallback(d: Diagnosis) {
  return NextResponse.json({
    source: "fallback" as const,
    interpretation: d.reason ?? "",
    message: d.hold ? "" : d.msg ?? "",
    selfMessage: d.selfMessage ?? "",
  });
}

// 설문 응답을 사람이 읽을 수 있는 요약으로(프롬프트 품질용)
function readableSummary(stage: Stage, a: Answers): string {
  const lines: string[] = [];
  for (const q of SURVEYS[stage]) {
    if (q.type === "text") continue;
    const v = a[q.id];
    if (!v) continue;
    const opt = q.options?.find((o) => o.v === v);
    if (opt) lines.push(`- ${q.title} → ${opt.label}`);
  }
  return lines.join("\n") || "- (응답 없음)";
}

const SYSTEM_PROMPT = `당신은 한국어로 답하는 'AI 연애 컨설턴트'입니다(코치가 아니라 컨설팅).

[원칙]
- 애착이론(안정/불안/회피)으로 사용자·상대의 패턴을 읽되 단정하지 마세요.
- 애착 유형을 언급하면 반드시 그 유형에 맞는 대응을 1개 이상 같은 답변에 담으세요(라벨만 붙이고 '기다려보라'로 끝내지 말 것). 참고 플레이북: 회피형 신호 → 공간 존중·낮은 연락 빈도·직접 추궁 금지 / 불안형 → 예측 가능성·일관된 안심 / 안정형 → 직접·솔직하게 다가가도 OK.
- 점수·관계 상태를 말할 땐 근거가 된 요인을 사용자 언어로 1~2개 함께 제시하세요(근거 없는 단정 수치 금지). 결혼·이별·고백 등 무게 있는 결정이면 안심 일변도로 가지 말고, 점검할 리스크 1가지를 균형 있게 곁들이세요.
- 정직하고 근거 기반으로 말하세요. 듣기 좋은 말(아부)보다 현실적인 조언을, 단 따뜻하고 비난하지 않는 톤으로.
- 사용자의 자율성을 존중하세요. 집착·반복연락·우회연락·스토킹·상대의 거부(차단 등) 무시는 절대 권하지 마세요.
- 안전 최우선: 통제·위협·폭력·자해 신호가 보이면 관계 조언보다 도움 요청을 우선하세요.

[제약]
- 점수·타이밍·추천행동·주의사항은 이미 '규칙 엔진'이 확정했습니다. 당신은 그 결과와 '일관된' 해석·문구만 만드세요. 점수나 타이밍을 새로 판단하거나 뒤집지 마세요.
- 의료·법률·투자 등 전문 조언은 하지 마세요.
- 사용자를 지칭할 때는 사용자 메시지의 '[사용자 호칭]'에 주어진 호칭(예: "민지님이" 또는 "당신이")만 사용하고, '너·네가' 같은 반말 호칭은 절대 쓰지 마세요.
- 미성년(minor)이면 더 따뜻하고 지지적인 눈높이로, 자극적·선정적 표현 없이. 필요하면 신뢰할 수 있는 어른·상담을 권할 수 있어요.

[출력]
- interpretation: 반드시 첫 문장에서 사용자가 지금 느낄 감정을 구체적으로 명명하고 "그럴 만하다"고 정상화하세요(사용자가 직접 적은 표현·단어를 인용한 구체적 공감 — 막연한 일반론 위로 금지). 그다음 문장부터 규칙 결과와 일관되게 상황을 해석하세요(총 3~5문장). 진단명·단정은 금지.
- message: 요청된 경우에만, 사용자가 상대에게 실제로 보낼 만한 자연스러운 한국어 메시지 1개(2~5줄). 부담스럽지 않고 진솔하게. 요청되지 않으면 빈 문자열("").
- selfMessage: 상대가 아니라 사용자 자신에게 건네는 따뜻한 한마디. 특히 연락을 권하지 않는 상황(보류·차단·안전)에서는 사용자의 마음을 다독이는 위로 한 줄을 꼭 채우세요(공감 → 정상화 → 자기돌봄). 진단명·단정 금지.
- 반드시 주어진 JSON 스키마로만 출력하세요.`;

export async function POST(req: Request) {
  let stage: Stage;
  let answers: Answers;
  let minor = false;
  let name = "";
  try {
    const body = await req.json();
    if (!isStage(body?.stage)) {
      return NextResponse.json({ error: "invalid stage" }, { status: 400 });
    }
    stage = body.stage;
    answers = (body.answers ?? {}) as Answers;
    minor = !!body.minor;
    name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // 점수·타이밍은 규칙 엔진이 정답 — 서버에서 재계산해 신뢰(클라이언트 결과를 그대로 믿지 않음)
  const d = diagnose(stage, answers);
  d.minor = minor;

  // 안전 우선: 학대 신고 케이스는 AI 우회, 규칙의 안전 메시지를 그대로 사용
  const isAbuse = (stage === "dating" || stage === "breakup") && answers.abuse === "yes";
  if (isAbuse) return fallback(d);

  // 키 미설정(로컬/배포 env) → 규칙 결과로 폴백 (앱은 키 없이도 정상 동작)
  if (!process.env.ANTHROPIC_API_KEY) return fallback(d);

  const wantMessage = !d.hold; // 보류(지금 연락 권장 안 함) 케이스는 문구 생성 안 함
  const honorific = name ? `${name}님` : "당신"; // 결과에서 사용자를 부를 호칭

  const userText = [
    `[상황] ${STAGE_LABEL[stage]}`,
    `[사용자 호칭] ${honorific} — 사용자를 부를 땐 "${honorific}"을 쓰되 한국어 조사를 올바르게 붙이세요(예: "${honorific}이", "${honorific}은", "${honorific}께서"). "${honorific}이가"처럼 조사를 겹쳐 쓰지 말고, '너·네가' 같은 반말도 쓰지 마세요.`,
    `[설문 응답]\n${readableSummary(stage, answers)}`,
    `[사용자가 직접 적은 상황]\n${(answers.freeText || "").trim() || "(없음)"}`,
    `[상대에 대한 설명]\n${(answers.partnerText || "").trim().slice(0, 1000) || "(없음)"}`,
    `[참고(점수 미반영)] 내 MBTI: ${answers.myMbti || "미입력"}, 상대 MBTI: ${answers.partnerMbti || "미입력"}`,
    minor ? `[중요] 사용자는 미성년입니다. 청소년 눈높이로 더 따뜻하고 안전하게.` : "",
    `[규칙 엔진 결과 — 이 결과를 신뢰하고 일관되게 작성]`,
    `- 점수: ${d.score}/100 (${d.scoreTitle})`,
    `- 점수 근거(상위 요인): ${d.factors.filter((x) => x.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3).map((x) => x.label).join(", ") || "없음"}`,
    `- 추천 타이밍: ${d.plan.when} / 추천 수단: ${d.plan.channel}`,
    `- 추천 액션: ${d.actions.map((a) => a.t).join(", ")}`,
    `- 주의: ${d.risks.join(" / ")}`,
    `- 상태: ${d.hold ? "보류 — 지금은 연락을 권하지 않음" : "연락 가능"}`,
    `- (참고) 규칙 기본 해석: ${d.reason ?? ""}`,
    d.msg ? `- (참고) 규칙 기본 예시 문구: ${d.msg}` : "",
    ``,
    `[작업]`,
    `1) interpretation: 먼저 첫 문장에서 사용자가 지금 느낄 감정을 구체적으로 명명하고 "그럴 만하다"고 정상화하세요(사용자가 freeText에 직접 쓴 표현을 인용; 막연한 일반론 위로 금지). 그다음 문장부터 위 결과와 일관되게, 사용자가 적은 내용과 '상대에 대한 설명'을 반영해 따뜻하고 정직하게 해석하세요(총 3~5문장). 상대 설명이 있으면 상대의 애착 성향(안정/불안/회피)·관심도·주의 신호를 조심스럽게 추론해 녹이되 단정하지 마세요. 점수·상태를 언급하면 위 '점수 근거(상위 요인)'를 사용자 언어로 1~2개 함께 풀어주세요(근거 없는 단정 수치 금지).`,
    `2) message: ${
      wantMessage
        ? "지금 상대에게 보낼 만한 자연스러운 메시지 1개(2~5줄)를 작성하세요. '상대에 대한 설명'이 있으면 상대 성향에 맞는 톤으로 맞추고, 사용자가 적은 말투·존댓말/반말·길이를 반영해 교과서체가 아니라 카톡에 바로 복붙할 수 있는 자연스러운 구어체로(미성년이면 또래 말투)."
        : '빈 문자열("")로 두세요. 지금은 상대에게 연락을 권하지 않는 상황입니다.'
    }`,
    `3) selfMessage: ${
      wantMessage
        ? `상대가 아니라 ${honorific} 자신에게 건네는 짧은 응원 한마디(1~2줄).`
        : `지금은 연락 대신 마음을 추스를 때예요. 상대가 아니라 ${honorific} 자신에게 건네는 따뜻한 위로·다짐 한마디(2~3줄)를 쓰세요. 연락하고 싶은 충동을 비난하지 말고 "자연스러운 마음"이라고 정상화한 뒤, 오늘 나를 돌보는 쪽으로 부드럽게 이끌어 주세요. 규칙 결과(보류·차단 등)와 일관되게, 단정·진단 표현 없이.`
    }`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
      // 구조화 출력 — SDK 타입 버전에 따라 output_config 미정의일 수 있어 부분 캐스팅
      ...({ output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } } } as Record<string, unknown>),
    });

    if (resp.stop_reason === "refusal") return fallback(d);

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return fallback(d);

    let parsed: { interpretation?: string; message?: string; selfMessage?: string };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return fallback(d);
    }

    const interpretation = (parsed.interpretation || "").trim() || d.reason || "";
    const message = wantMessage ? (parsed.message || "").trim() || d.msg || "" : "";
    const selfMessage = (parsed.selfMessage || "").trim() || d.selfMessage || "";
    return NextResponse.json({ source: "ai" as const, interpretation, message, selfMessage });
  } catch {
    // 호출 실패(네트워크·인증·과금 등) → 규칙 결과로 폴백
    return fallback(d);
  }
}
