/* ============================================================
   Pacemaker Prototype — 플로우 로직 + Mock 진단 엔진
   ※ 실제 AI 호출 대신 심리 프레임워크를 흉내 낸 규칙으로 진단 생성
   ============================================================ */

// ── 상태 ──────────────────────────────────────
const state = { stage: null, qIndex: 0, answers: {} };

// ── 설문 정의 (단계별 분기) ───────────────────
// 공통 마지막 질문: 상대 성향(애착 유형 추정)
const PARTNER_Q = {
  id: "partner",
  title: "상대는 평소 연락·감정 표현이 어떤 편인가요?",
  options: [
    { v: "expressive", label: "표현이 풍부하고 일관돼요", note: "안정형에 가까움" },
    { v: "inconsistent", label: "들쭉날쭉, 기복이 있어요", note: "불안형에 가까움" },
    { v: "reserved", label: "표현이 적고 거리를 둬요", note: "회피형에 가까움" },
  ],
};

const SURVEYS = {
  crush: [
    { id: "period", title: "알게 된 지 얼마나 됐나요?", options: [
      { v: "lt1m", label: "1개월 미만" },
      { v: "1to3m", label: "1~3개월" },
      { v: "3to6m", label: "3~6개월" },
      { v: "gt6m", label: "6개월 이상" },
    ]},
    { id: "trend", title: "요즘 둘의 연락 빈도는?", options: [
      { v: "increasing", label: "점점 늘어나요", note: "좋은 신호" },
      { v: "stable", label: "비슷하게 유지돼요" },
      { v: "decreasing", label: "점점 줄어들어요", note: "주의" },
    ]},
    { id: "warmth", title: "상대의 반응 온도는 어떤가요?", options: [
      { v: "hot", label: "적극적이에요 (먼저 연락·관심)" },
      { v: "warm", label: "호의적이에요" },
      { v: "lukewarm", label: "미적지근해요" },
      { v: "cold", label: "잘 모르겠어요 / 거리감" },
    ]},
    { id: "meet", title: "둘이 따로 만난 적이 있나요?", options: [
      { v: "many", label: "여러 번 있어요" },
      { v: "few", label: "한두 번 있어요" },
      { v: "none", label: "아직 없어요" },
    ]},
    PARTNER_Q,
  ],
  dating: [
    { id: "period", title: "사귄 지 얼마나 됐나요?", options: [
      { v: "lt3m", label: "3개월 미만" },
      { v: "3to12m", label: "3개월~1년" },
      { v: "1to3y", label: "1~3년" },
      { v: "gt3y", label: "3년 이상" },
    ]},
    { id: "mood", title: "최근 관계 분위기는?", options: [
      { v: "better", label: "점점 좋아지고 있어요" },
      { v: "same", label: "비슷해요" },
      { v: "cooling", label: "식어가는 것 같아요", note: "주의" },
    ]},
    { id: "conflict", title: "최근 갈등이 있었나요?", options: [
      { v: "none", label: "거의 없어요" },
      { v: "minor", label: "작은 다툼이 있었어요" },
      { v: "serious", label: "큰 갈등이 있었어요" },
    ]},
    { id: "worry", title: "가장 불안한 부분은?", options: [
      { v: "less_contact", label: "연락이 줄었어요" },
      { v: "less_affection", label: "애정 표현이 줄었어요" },
      { v: "busy", label: "상대가 너무 바빠요" },
      { v: "overthink", label: "사실 내 불안이 큰 것 같아요" },
    ]},
    PARTNER_Q,
  ],
  breakup: [
    { id: "period", title: "사귄 기간은 얼마였나요?", options: [
      { v: "lt3m", label: "3개월 미만" },
      { v: "3to12m", label: "3개월~1년" },
      { v: "1to3y", label: "1~3년" },
      { v: "gt3y", label: "3년 이상" },
    ]},
    { id: "since", title: "헤어진 지 얼마나 됐나요?", options: [
      { v: "lt1w", label: "1주일 미만" },
      { v: "1to2w", label: "1~2주" },
      { v: "2to4w", label: "2~4주" },
      { v: "1to3m", label: "1~3개월" },
      { v: "gt3m", label: "3개월 이상" },
    ]},
    { id: "who", title: "누가 이별을 제안했나요?", options: [
      { v: "me", label: "내가 먼저" },
      { v: "partner", label: "상대가 먼저" },
      { v: "mutual", label: "서로 합의" },
    ]},
    { id: "reason", title: "이별의 핵심 이유는?", options: [
      { v: "conflict", label: "잦은 다툼" },
      { v: "drift", label: "권태 / 소원해짐" },
      { v: "personality", label: "성격 차이" },
      { v: "external", label: "환경 (거리·바쁨 등)", note: "회복 가능성 높음" },
      { v: "other_person", label: "상대의 변심", note: "신중 필요" },
    ]},
    { id: "contact", title: "헤어진 후 연락은 어떤가요?", options: [
      { v: "none", label: "전혀 안 했어요" },
      { v: "occasional", label: "가끔 가벼운 연락" },
      { v: "frequent", label: "자주 연락해요" },
      { v: "fighting", label: "연락하다 또 다퉜어요", note: "주의" },
    ]},
    PARTNER_Q,
  ],
};

// ── Mock 진단 엔진 ────────────────────────────
const clamp = (n) => Math.max(3, Math.min(97, Math.round(n)));

function diagnose(stage, a) {
  if (stage === "crush") return diagnoseCrush(a);
  if (stage === "dating") return diagnoseDating(a);
  return diagnoseBreakup(a);
}

// 고백 적정도
function diagnoseCrush(a) {
  let s = 50;
  s += { increasing: 16, stable: 3, decreasing: -16 }[a.trend] || 0;
  s += { hot: 22, warm: 11, lukewarm: -9, cold: -22 }[a.warmth] || 0;
  s += { many: 13, few: 3, none: -11 }[a.meet] || 0;
  s += { lt1m: -9, "1to3m": 6, "3to6m": 5, gt6m: -4 }[a.period] || 0;
  s += { expressive: 6, inconsistent: 0, reserved: -9 }[a.partner] || 0;
  s = clamp(s);

  const res = { scoreTitle: "고백 적정도", score: s };
  if (s >= 65) {
    res.reason = "상대의 호감 신호와 관계 흐름이 충분히 무르익었어요. 미루면 오히려 ‘좋은 사람’ 프레임에 갇힐 수 있습니다.";
    res.actions = [
      { t: "가까운 시일 내 자연스러운 고백", d: "거창한 이벤트보다, 둘만의 편안한 자리에서 진심을 전하세요." },
      { t: "직접 또는 통화로", d: "썸 단계 고백은 텍스트보다 표정·목소리가 전달되는 채널이 성공률이 높아요." },
      { t: "부담 낮은 프레이밍", d: "‘부담 주려는 건 아닌데’로 시작해 상대의 퇴로를 열어두세요." },
    ];
    res.risks = ["과한 이벤트·선물은 부담이 될 수 있어요.", "고백 후 답을 재촉하지 마세요."];
    res.msgLabel = "고백 운 떼기 예시";
    res.msg = "요즘 너랑 얘기하는 시간이 제일 편하고 좋더라.\n부담 주려는 건 아닌데, 나는 너를 좀 더 알아가고 싶어.\n이번 주에 둘이 따로 한번 볼래?";
  } else if (s >= 45) {
    res.reason = "호감의 씨앗은 있지만 확신을 주기엔 신호가 약해요. 지금 고백은 도박입니다. 1~2주 더 ‘함께한 경험’을 쌓으세요.";
    res.actions = [
      { t: "고백보다 ‘만남 제안’ 먼저", d: "둘만의 시간을 늘려 호감 온도를 끌어올리세요." },
      { t: "상대 반응 테스트", d: "가벼운 관심 표현에 어떻게 반응하는지 관찰하세요." },
      { t: "연락 리듬 맞추기", d: "내가 과하게 주도하기보다 상호 빈도를 맞추세요." },
    ];
    res.risks = ["조급한 고백은 관계를 어색하게 만들 수 있어요.", "혼자 확신을 키우는 ‘과대 해석’을 경계하세요."];
    res.msgLabel = "만남 제안 예시";
    res.msg = "지난번에 말한 그 카페 가보고 싶다고 했잖아.\n이번 주말에 같이 갈래? 가서 더 얘기하자 :)";
  } else {
    res.reason = "지금은 고백 타이밍이 아니에요. 상대의 신호가 약하거나 정보가 부족합니다. 무리한 고백은 관계 자체를 잃게 할 수 있어요.";
    res.actions = [
      { t: "관계의 기반부터", d: "고백 전에 ‘편한 사람’에서 ‘설레는 사람’으로 인식을 바꿀 경험이 필요해요." },
      { t: "거리 두며 관찰", d: "내 연락 비중을 줄이고 상대가 다가오는지 확인하세요." },
      { t: "다른 가능성도 열기", d: "한 사람에게 모든 걸 걸지 않는 것이 건강합니다." },
    ];
    res.risks = ["답 없는 호감에 집착하면 본인이 가장 힘들어져요.", "상대가 거리를 두면 그 신호를 존중하세요."];
    res.msgLabel = "지금은 고백 메시지보다";
    res.hold = "지금은 고백 문구를 보내기보다, 가벼운 일상 공유로 ‘편안한 접점’을 유지하는 단계예요. 무리한 직진은 권하지 않습니다.";
  }
  return res;
}

// 관계 안정도
function diagnoseDating(a) {
  let s = 58;
  s += { better: 14, same: 0, cooling: -20 }[a.mood] || 0;
  s += { none: 6, minor: -4, serious: -16 }[a.conflict] || 0;
  s += { less_contact: -6, less_affection: -8, busy: -3, overthink: 2 }[a.worry] || 0;
  s += { lt3m: -2, "3to12m": 4, "1to3y": 3, gt3y: 0 }[a.period] || 0;
  s += { expressive: 5, inconsistent: -2, reserved: -6 }[a.partner] || 0;
  s = clamp(s);

  const res = { scoreTitle: "관계 안정도", score: s };
  const worryMap = {
    less_contact: "연락 빈도", less_affection: "애정 표현", busy: "상대의 여유 부족", overthink: "스스로의 불안",
  };
  if (s >= 65) {
    res.reason = "관계는 비교적 안정적이에요. 불안의 상당 부분은 실제 위기보다 해석에서 옵니다. 큰 변화보다 ‘유지’에 집중하세요.";
    res.actions = [
      { t: "감사·인정 표현 늘리기", d: "관계가 좋을 때의 작은 표현이 안정성을 더 키웁니다." },
      { t: "불안은 솔직하게, 추궁은 금지", d: `‘${worryMap[a.worry]}’가 신경 쓰인다면 비난 없이 ‘나 전달법’으로 말하세요.` },
      { t: "둘만의 루틴 만들기", d: "정기적인 데이트·대화 시간이 관계를 단단하게 합니다." },
    ];
    res.risks = ["불안을 자주 ‘확인 질문’으로 풀면 상대가 지칠 수 있어요."];
    res.msgLabel = "마음 표현 예시";
    res.msg = "요즘 바빠서 자주 못 봤는데, 그래도 네 생각 많이 했어.\n이번 주에 짧게라도 얼굴 보자. 보고 싶어서 :)";
  } else if (s >= 45) {
    res.reason = `약한 경고 신호가 있어요. 핵심은 '${worryMap[a.worry]}'. 방치하면 거리감이 굳어집니다. 지금이 대화로 풀 적기예요.`;
    res.actions = [
      { t: "비난 없는 솔직한 대화", d: "‘요즘 우리 어때?’ 같은 열린 질문으로 상대 입장을 먼저 들으세요." },
      { t: "원인 분리", d: "상대 문제인지, 내 불안인지 구분해야 올바른 해법이 나와요." },
      { t: "작은 긍정 경험 쌓기", d: "큰 담판보다 함께 웃는 시간을 의도적으로 늘리세요." },
    ];
    res.risks = ["감정이 격할 때의 대화는 갈등을 키워요. 차분할 때 시도하세요.", "‘식었어?’ 같은 단정형 질문은 피하세요."];
    res.msgLabel = "대화 열기 예시";
    res.msg = "요즘 우리 둘 다 정신없었던 것 같아.\n나는 너랑 더 가까이 지내고 싶어서, 이번 주말에 천천히 얘기하면서 시간 보내고 싶어.";
  } else {
    res.reason = "관계에 분명한 위기 신호가 있어요. 지금 필요한 건 ‘더 잘하기’가 아니라 솔직한 점검 대화입니다.";
    res.actions = [
      { t: "회피 말고 직면", d: "불편해도 관계 상태에 대해 진솔하게 이야기할 자리를 만드세요." },
      { t: "상대 마음 확인", d: "내 노력만으로 끌고 가려 하지 말고 상대의 의지를 확인하세요." },
      { t: "나를 지키는 선도 준비", d: "관계 유지가 나를 갉아먹는다면 그것도 신호입니다." },
    ];
    res.risks = ["불안에서 나오는 과한 집착·확인은 상황을 악화시켜요.", "혼자 매달리는 관계는 건강하지 않습니다."];
    res.msgLabel = "점검 대화 제안 예시";
    res.msg = "요즘 너와 나 사이가 예전 같지 않게 느껴져.\n탓하려는 게 아니라, 우리가 어떤 상태인지 솔직하게 한번 얘기하고 싶어.";
  }
  return res;
}

// 재회 시도 적정도
function diagnoseBreakup(a) {
  let s = 50;
  s += { lt1w: -24, "1to2w": -10, "2to4w": 10, "1to3m": 17, gt3m: 4 }[a.since] || 0;
  s += { me: 8, partner: -12, mutual: 1 }[a.who] || 0;
  s += { conflict: -4, drift: -8, personality: -10, external: 13, other_person: -16 }[a.reason] || 0;
  s += { none: 6, occasional: 3, frequent: -8, fighting: -20 }[a.contact] || 0;
  s += { lt3m: -4, "3to12m": 2, "1to3y": 5, gt3y: 4 }[a.period] || 0;
  s += { expressive: 5, inconsistent: -2, reserved: -10 }[a.partner] || 0;
  s = clamp(s);

  const tooSoon = a.since === "lt1w" || a.since === "1to2w";
  const res = { scoreTitle: "재회 시도 적정도", score: s };

  if (s >= 65) {
    res.reason = "재회를 시도하기 좋은 흐름이에요. 충분한 시간이 흘렀고 회복 가능한 이유입니다. 단, 매달림이 아닌 ‘가벼운 재접촉’으로 시작하세요.";
    res.actions = [
      { t: "부담 없는 안부로 재접촉", d: "재회 얘기를 꺼내지 말고, 가벼운 일상 안부 한 통으로 문을 여세요." },
      { t: "달라진 모습 보여주기", d: "이별 사유였던 부분에서 변화를 ‘말’이 아닌 ‘모습’으로 보여주세요." },
      { t: "상대 반응에 맞춰 속도 조절", d: "답이 따뜻하면 한 걸음, 미지근하면 다시 기다리세요." },
    ];
    res.risks = ["첫 연락에 ‘다시 만나자’는 금물 — 부담으로 닫혀요.", "답이 늦거나 차가워도 연달아 보내지 마세요."];
    res.msgLabel = "가벼운 재접촉 예시";
    res.msg = "잘 지내지? 지나가다 우리 자주 가던 곳 보고 문득 생각나서.\n별 일 아니고, 그냥 잘 지내나 궁금했어.";
  } else if (s >= 45) {
    res.reason = "가능성은 있지만 지금 바로는 일러요. 감정이 정리될 시간과, 관계를 바꿀 변화가 더 필요합니다. 조금 더 기다리며 준비하세요.";
    res.actions = [
      { t: "최소 연락 기간 더 유지", d: tooSoon ? "지금은 연락을 멈추고 서로 감정을 식히는 시간이 먼저예요." : "조급한 재접촉보다 2~3주 더 거리를 두세요." },
      { t: "이별 원인 복기", d: "무엇을 바꿀지 구체적으로 정리해야 재회가 의미 있어요." },
      { t: "나부터 회복", d: "내 일상과 멘탈이 안정돼야 매달리지 않는 연락이 가능해요." },
    ];
    res.risks = ["불안에 못 이긴 연락은 ‘아직 못 놓았구나’ 인상만 줘요.", "상대의 SNS 반복 확인·추궁은 금물입니다."];
    res.msgLabel = "지금 보낼 메시지보다";
    res.hold = "지금은 연락 문구를 다듬을 때가 아니라, 거리를 두고 나를 회복하며 ‘무엇을 바꿀지’ 정리할 시기예요. 2~3주 뒤 다시 진단해 보세요.";
  } else {
    res.reason = "지금 재회 시도는 권하지 않아요. 시간이 너무 이르거나, 회복이 어려운 신호(상대 변심·반복된 다툼 등)가 보입니다. 무리한 연락은 가능성을 더 닫습니다.";
    res.actions = [
      { t: "연락을 멈추고 거리 두기", d: "지금의 연락은 대부분 역효과예요. 나를 추스르는 데 집중하세요." },
      { t: "감정과 사실 분리", d: "‘다시 만나고 싶다’는 마음이 미련인지 사랑인지 시간을 두고 확인하세요." },
      { t: "상대의 의사 존중", d: "상대가 거리를 원하면 그 결정을 존중하는 것이 가장 품위 있는 선택이에요." },
    ];
    res.risks = ["반복 연락·집착은 스토킹으로 비칠 수 있어요. 절대 금물.", "상대가 명확히 거부하면 더는 시도하지 마세요. 당신의 회복이 우선입니다."];
    res.msgLabel = "지금은 메시지를 보내지 마세요";
    res.hold = "지금 어떤 메시지도 재회 확률을 높이지 못해요. 오히려 닫힌 문을 더 잠급니다. 연락 충동이 들면, 보내는 대신 그 마음을 기록만 해두세요.";
  }
  return res;
}

// ── 화면 전환 ─────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
  document.getElementById(id).classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── 설문 렌더링 ───────────────────────────────
function renderQuestion() {
  const survey = SURVEYS[state.stage];
  const q = survey[state.qIndex];
  const total = survey.length;

  document.getElementById("progressBar").style.width = `${(state.qIndex / total) * 100}%`;
  document.getElementById("qCount").textContent = `질문 ${state.qIndex + 1} / ${total}`;
  document.getElementById("qTitle").textContent = q.title;
  document.getElementById("btnPrev").style.visibility = state.qIndex === 0 ? "hidden" : "visible";

  const box = document.getElementById("qOptions");
  box.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "q-option" + (state.answers[q.id] === opt.v ? " selected" : "");
    btn.innerHTML = opt.note
      ? `${opt.label}<span class="opt-note">${opt.note}</span>`
      : opt.label;
    btn.onclick = () => selectOption(q.id, opt.v);
    box.appendChild(btn);
  });
}

function selectOption(qid, value) {
  state.answers[qid] = value;
  renderQuestion();
  const survey = SURVEYS[state.stage];
  setTimeout(() => {
    if (state.qIndex < survey.length - 1) {
      state.qIndex++;
      renderQuestion();
    } else {
      runAnalysis();
    }
  }, 260);
}

// ── 분석 연출 → 리포트 ────────────────────────
function runAnalysis() {
  showScreen("screen-analyzing");
  document.getElementById("progressBar").style.width = "100%";
  const steps = [
    "데이터 정규화 중…",
    "애착 유형·관계 단계 매칭 중…",
    "타이밍 프레임워크 적용 중…",
    "추천 액션·메시지 생성 중…",
  ];
  let i = 0;
  const el = document.getElementById("analyzingStep");
  el.textContent = steps[0];
  const timer = setInterval(() => {
    i++;
    if (i < steps.length) el.textContent = steps[i];
    else {
      clearInterval(timer);
      renderReport(diagnose(state.stage, state.answers));
      showScreen("screen-report");
    }
  }, 650);
}

// ── 리포트 렌더링 ─────────────────────────────
function renderReport(d) {
  const color = d.score >= 65 ? "var(--good)" : d.score >= 45 ? "var(--warn)" : "var(--bad)";
  const badge = d.score >= 65 ? "지금이 좋은 타이밍" : d.score >= 45 ? "조금 더 준비가 필요" : "지금은 기다릴 때";
  const C = 2 * Math.PI * 52; // 둘레
  const offset = C * (1 - d.score / 100);

  const actionsHtml = d.actions.map((a, i) => `
    <li class="action-item">
      <span class="action-num">${i + 1}</span>
      <span class="action-body"><b>${a.t}</b><span>${a.d}</span></span>
    </li>`).join("");

  const risksHtml = d.risks.map((r) => `<li class="risk-item">${r}</li>`).join("");

  const msgHtml = d.hold
    ? `<div class="msg-hold">${d.hold}</div>`
    : `<div class="msg-bubble">${d.msg}</div>`;

  document.getElementById("report").innerHTML = `
    <div class="report-card score-card">
      <p class="score-title">${d.scoreTitle}</p>
      <div class="ring-wrap">
        <svg width="160" height="160" viewBox="0 0 130 130">
          <circle class="ring-bg" cx="65" cy="65" r="52"></circle>
          <circle class="ring-fg" cx="65" cy="65" r="52"
            stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${C}"
            id="ringFg"></circle>
        </svg>
        <div class="ring-center">
          <span class="ring-score" style="color:${color}">${d.score}</span>
          <span class="ring-unit">/ 100</span>
        </div>
      </div>
      <span class="score-badge" style="color:${color};background:${color}1a">${badge}</span>
      <p class="score-reason">${d.reason}</p>
    </div>

    <div class="report-card">
      <p class="card-label">🧭 추천 액션</p>
      <ul class="action-list">${actionsHtml}</ul>
    </div>

    <div class="report-card">
      <p class="card-label">⚠️ 이것만은 주의하세요</p>
      <ul class="risk-list">${risksHtml}</ul>
    </div>

    <div class="report-card msg-card">
      <p class="card-label">💬 ${d.msgLabel}</p>
      ${msgHtml}
    </div>
  `;

  // 링 애니메이션 (다음 프레임에 적용)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById("ringFg").style.strokeDashoffset = offset;
    });
  });
}

// ── 리셋 ──────────────────────────────────────
function reset() {
  state.stage = null;
  state.qIndex = 0;
  state.answers = {};
}

// ── 이벤트 바인딩 ─────────────────────────────
document.addEventListener("click", (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  const stageBtn = e.target.closest("[data-stage]");

  if (action === "start") showScreen("screen-stage");
  else if (action === "home") { reset(); showScreen("screen-landing"); }
  else if (action === "restart") { reset(); showScreen("screen-stage"); }
  else if (action === "prev") {
    if (state.qIndex > 0) { state.qIndex--; renderQuestion(); }
  } else if (stageBtn) {
    state.stage = stageBtn.dataset.stage;
    state.qIndex = 0;
    state.answers = {};
    renderQuestion();
    showScreen("screen-survey");
  }
});
