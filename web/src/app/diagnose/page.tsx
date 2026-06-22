"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SURVEYS, type Stage } from "@/lib/diagnose/survey";
import { diagnose, type Answers, type Diagnosis } from "@/lib/diagnose/engine";
import { Report } from "@/components/Report";
import { LegalEthicsNotice } from "@/components/SupportNotices";
import { YearSelect, MbtiSelect } from "@/components/InfoFields";
import { getProfile, saveProfile } from "@/lib/profile";

const STAGES: { v: Stage; name: string; note: string }[] = [
  { v: "crush", name: "썸 타는 중", note: "고백 타이밍이 고민돼요" },
  { v: "dating", name: "연애 중", note: "관계가 불안해요" },
  { v: "breakup", name: "이별 후", note: "재회하고 싶어요" },
];

type Phase = "me" | "stage" | "partner" | "survey" | "result";
type SaveStatus = "idle" | "saving" | "saved" | "error" | "guest";

// 게스트 진단 결과 임시 보존 키(가입/로그인 직후 /diagnose 재진입 시 복원·저장)
const PENDING_KEY = "pacemaker:pendingDiagnosis";

// ── 통합 진행 스텝(대단계) ──
// me/stage/partner/survey 4단계의 위치를 글래스 톤 세그먼트로 표시.
// 로그인으로 '내 정보'를 건너뛴 경우(meDone) 1번 단계는 done 처리.
const STEP_LABELS = ["내 정보", "상황", "상대", "설문"] as const;
const STEP_PHASES: Phase[] = ["me", "stage", "partner", "survey"];

function StepIndicator({ phase, meDone }: { phase: Phase; meDone: boolean }) {
  const current = STEP_PHASES.indexOf(phase);
  return (
    <div className="mb-5 flex items-center gap-2" aria-label="진행 단계" role="list">
      {STEP_LABELS.map((label, i) => {
        const isCurrent = i === current;
        const isDone = i < current || (i === 0 && meDone && current >= 0);
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5" role="listitem"
            aria-current={isCurrent ? "step" : undefined}>
            <span className={`h-1.5 w-full rounded-full transition-colors ${
              isCurrent ? "bg-primary" : isDone ? "bg-primary/55" : "bg-line"
            }`} />
            <span className={`text-[10.5px] font-bold tracking-tight ${
              isCurrent ? "text-primaryDark" : isDone ? "text-primary/80" : "text-muted/60"
            }`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// 선택됨 표시용 인라인 체크 아이콘
function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-primaryDark" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

const CUR_YEAR = new Date().getFullYear();
// 청소년(청소년 모드) 판정: 연 나이 19세 이하 (안전상 넉넉히 포함)
function isMinorYear(year: number | null): boolean {
  return year != null && CUR_YEAR - year <= 19;
}

export default function DiagnosePage() {
  const [phase, setPhase] = useState<Phase>("me");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [hasProfileBirth, setHasProfileBirth] = useState(false); // 로그인+생년 있으면 '내 정보' 단계 생략
  const [myBirthYear, setMyBirthYear] = useState("");
  const [myMbti, setMyMbti] = useState("");
  const [stage, setStage] = useState<Stage>("crush");
  const [partnerBirthYear, setPartnerBirthYear] = useState("");
  const [partnerMbti, setPartnerMbti] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [free, setFree] = useState("");
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const savingRef = useRef(false);    // 중복 저장(insert) 방지
  const advancingRef = useRef(false); // 설문 빠른 연타 방지

  // 로그인 유저면 프로필 로드 → 생년 알면 '내 정보' 단계 생략
  // 로그인 + localStorage에 게스트 진단 결과가 있으면: 저장 후 결과 화면으로 복원(우선)
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        // ── 게스트 결과 복원(로그인 상태에서만) ──
        if (user) {
          let pending: { stage: Stage; result: Diagnosis } | null = null;
          try {
            const raw = localStorage.getItem(PENDING_KEY);
            if (raw) pending = JSON.parse(raw);
          } catch {
            pending = null; // 파싱 실패 — 무시
          }
          if (pending && pending.result && pending.stage) {
            try {
              const d = pending.result;
              await supabase.from("diagnoses").insert({
                user_id: user.id,
                stage: pending.stage,
                score: d.score,
                result: d,
              });
            } catch {
              // insert 실패해도 결과는 보여줌(아래에서 복원)
            }
            try { localStorage.removeItem(PENDING_KEY); } catch {}
            setStage(pending.stage);
            setResult(pending.result);
            setSaveStatus("saved");
            setPhase("result");
            setLoadingProfile(false);
            return; // pending 복원이 프로필 기반 phase 결정보다 우선
          }
        }

        const p = await getProfile(supabase);
        if (p) {
          if (p.birthYear) { setMyBirthYear(String(p.birthYear)); setHasProfileBirth(true); }
          if (p.mbti) setMyMbti(p.mbti);
          if (p.birthYear) setPhase("stage");
        }
      } catch {
        // 비로그인/오류 — 기본 'me' 단계 유지
      }
      setLoadingProfile(false);
    })();
  }, []);

  const minor = isMinorYear(myBirthYear ? Number(myBirthYear) : null);

  // stage 를 인자로 받아 in-flight 중 stage 변경에도 안전하게 저장
  async function saveDiagnosis(d: Diagnosis, s: Stage) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      if (!user) {
        // 게스트: 결과를 localStorage에 보존(가입/로그인 후 /diagnose 재진입 시 복원)
        try {
          localStorage.setItem(PENDING_KEY, JSON.stringify({ stage: s, result: d }));
        } catch {
          // 저장 실패는 무시(시크릿 모드 등)
        }
        setSaveStatus("guest");
        return;
      }
      const { error } = await supabase.from("diagnoses").insert({
        user_id: user.id,
        stage: s,
        score: d.score,
        result: d,
      });
      setSaveStatus(error ? "error" : "saved");
    } catch {
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
    }
  }

  function finish(ans: Answers) {
    const s = stage;
    const merged: Answers = { ...ans, myMbti, partnerMbti, myBirthYear, partnerBirthYear };
    const d = diagnose(s, merged);
    d.minor = minor; // 생년 기반 청소년 모드
    setResult(d);
    setPhase("result");
    saveDiagnosis(d, s);
  }

  function selectOption(qid: string, v: string) {
    if (advancingRef.current) return;
    advancingRef.current = true;
    const next = { ...answers, [qid]: v };
    setAnswers(next);
    const survey = SURVEYS[stage];
    const isLast = qIndex >= survey.length - 1;
    setTimeout(() => {
      advancingRef.current = false;
      if (isLast) finish(next);
      else setQIndex((i) => i + 1);
    }, 320);
  }

  async function submitMe() {
    if (!myBirthYear) return;
    // 로그인 상태면 프로필에 저장(베스트에포트 — 구글 가입 등 생년 미수집 사용자 백필)
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) await saveProfile(supabase, { birthYear: Number(myBirthYear), mbti: myMbti || null });
    } catch {
      // 무시
    }
    setPhase("stage");
  }

  function pickStage(s: Stage) {
    setStage(s); setAnswers({}); setQIndex(0); setFree("");
    setPartnerBirthYear(""); setPartnerMbti(""); setPhase("partner");
  }

  function reset() {
    setPhase("stage"); setAnswers({}); setQIndex(0); setResult(null);
    setFree(""); setSaveStatus("idle"); setPartnerBirthYear(""); setPartnerMbti("");
  }

  // ── 프로필 로딩 중 ──
  if (loadingProfile) {
    return <div className="card text-center text-sm text-muted">불러오는 중…</div>;
  }

  // ── 내 정보 (생년 + 내 MBTI) ──
  if (phase === "me") {
    return (
      <div>
        <Link href="/" className="text-sm text-muted">← 처음으로</Link>
        <StepIndicator phase="me" meDone={hasProfileBirth} />
        <h2 className="mb-1.5 mt-2 text-[26px] font-bold tracking-tight">먼저, 당신에 대해 알려주세요</h2>
        <p className="mb-6 text-sm text-muted">나이에 맞춰 더 편하게 설명하고, 결과를 개인화하는 데 써요.</p>

        <label className="mb-1.5 block text-[13px] font-bold">출생연도</label>
        <div className="mb-4"><YearSelect value={myBirthYear} onChange={setMyBirthYear} ariaLabel="내 출생연도" /></div>

        <label className="mb-1.5 block text-[13px] font-bold">내 MBTI <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-1.5"><MbtiSelect value={myMbti} onChange={setMyMbti} ariaLabel="내 MBTI" /></div>
        <p className="mb-5 text-[12.5px] text-muted">MBTI는 참고 요소예요. 몰라도 진단에는 문제없어요.</p>

        <button className="btn btn-primary" onClick={submitMe} disabled={!myBirthYear}>다음</button>
      </div>
    );
  }

  // ── 상황 선택 ──
  if (phase === "stage") {
    return (
      <div>
        {hasProfileBirth
          ? <Link href="/" className="text-sm text-muted">← 처음으로</Link>
          : <button onClick={() => setPhase("me")} className="text-sm text-muted">← 내 정보</button>}
        <StepIndicator phase="stage" meDone={hasProfileBirth} />
        <h2 className="mb-1.5 mt-2 text-[26px] font-bold tracking-tight">지금 어떤 상황인가요?</h2>
        <p className="mb-6 text-sm text-muted">상황에 맞춰 질문이 달라집니다. 로그인 없이 바로 진단받을 수 있어요.</p>
        <div className="flex flex-col gap-3.5">
          {STAGES.map((s) => (
            <button key={s.v} onClick={() => pickStage(s.v)}
              className="flex items-center justify-between rounded-[18px] border border-white/60 bg-white/60 p-5 text-left backdrop-blur transition active:scale-[0.98] hover:border-primary">
              <span>
                <span className="block text-lg font-bold">{s.name}</span>
                <span className="block text-[13px] text-muted">{s.note}</span>
              </span>
              <span className="text-xl text-muted" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
        {minor ? (
          <p className="mt-6 text-center text-[12.5px] text-muted">편하게 골라줘요. 정답은 없어요.</p>
        ) : (
          <div className="mt-6 rounded-xl border border-line bg-surface/60 p-3.5">
            <LegalEthicsNotice />
          </div>
        )}
      </div>
    );
  }

  // ── 상대 정보 (선택) ──
  if (phase === "partner") {
    return (
      <div>
        <button onClick={() => setPhase("stage")} className="text-sm text-muted">← 상황</button>
        <StepIndicator phase="partner" meDone={hasProfileBirth} />
        <h2 className="mb-1.5 mt-2 text-[26px] font-bold tracking-tight">상대에 대해 아는 게 있나요?</h2>
        <p className="mb-6 text-sm text-muted">알면 궁합·소통 팁을 더해드려요. <b className="text-ink">몰라도 괜찮아요</b> — 건너뛰어도 진단은 똑같이 정확해요.</p>

        <label className="mb-1.5 block text-[13px] font-bold">상대 출생연도 <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-4"><YearSelect value={partnerBirthYear} onChange={setPartnerBirthYear} ariaLabel="상대 출생연도" /></div>

        <label className="mb-1.5 block text-[13px] font-bold">상대 MBTI <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-1.5"><MbtiSelect value={partnerMbti} onChange={setPartnerMbti} ariaLabel="상대 MBTI" /></div>
        <p className="mb-3 text-[12.5px] text-muted">상대 정보는 제3자 정보라 꼭 필요한 만큼만 받아요. MBTI·나이차는 참고 요소예요.</p>

        <details className="mb-5 rounded-xl border border-white/60 bg-white/45 px-3.5 py-2.5 backdrop-blur">
          <summary className="cursor-pointer list-none text-[12.5px] font-bold text-primaryDark marker:content-none">입력하면 뭐가 달라지나요?</summary>
          <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-muted">
            <li>· 상대 MBTI → 소통·메시지 톤 팁</li>
            <li>· 나·상대 MBTI → 궁합 한 줄</li>
            <li>· 출생연도 → 나이차 참고</li>
          </ul>
          <p className="mt-2 text-[11.5px] text-muted/80">모두 점수엔 미반영, 참고용이에요.</p>
        </details>

        <button className="btn btn-primary" onClick={() => setPhase("survey")}>다음</button>
        <button className="btn btn-ghost mt-2.5" onClick={() => { setPartnerBirthYear(""); setPartnerMbti(""); setPhase("survey"); }}>모르겠어요 · 건너뛰기</button>
      </div>
    );
  }

  // ── 결과 ──
  if (phase === "result" && result) {
    return (
      <div>
        {saveStatus === "saving" && <p className="mb-3 text-center text-xs text-muted">결과 저장 중…</p>}
        {saveStatus === "saved" && <p className="mb-3 text-center text-xs text-good">히스토리에 저장됨</p>}
        {saveStatus === "error" && (
          <div className="mb-3 text-center">
            <p className="text-xs text-bad">저장에 실패했어요. 네트워크·로그인 상태를 확인해 주세요.</p>
            <button className="mt-1.5 text-xs font-bold text-primaryDark underline"
              onClick={() => result && saveDiagnosis(result, stage)}>다시 저장</button>
          </div>
        )}

        {saveStatus === "guest" && (
          <div className="mb-4 rounded-2xl border border-primary bg-primarySoft p-4 text-center">
            <p className="text-sm font-bold text-ink">이 결과를 저장할까요?</p>
            <p className="mb-3 mt-1 text-[13px] text-muted">로그인하면 진단 결과가 히스토리에 저장돼 언제든 다시 볼 수 있어요.</p>
            <div className="flex gap-2">
              <Link href="/signup" className="btn btn-primary flex-1 text-center">회원가입</Link>
              <Link href="/login" className="btn btn-ghost flex-1 text-center">로그인</Link>
            </div>
          </div>
        )}

        <Report d={result} />
        <button className="btn btn-ghost mt-5" onClick={reset}>다시 진단하기</button>
        {saveStatus === "guest" && (
          <Link href="/" className="btn btn-ghost mt-3 block text-center">처음으로</Link>
        )}
      </div>
    );
  }

  // ── 설문 ──
  const survey = SURVEYS[stage];
  const q = survey[qIndex];
  const total = survey.length;

  return (
    <div>
      <StepIndicator phase="survey" meDone={hasProfileBirth} />
      <button onClick={() => (qIndex > 0 ? setQIndex(qIndex - 1) : setPhase("partner"))}
        className="rounded-full bg-white/55 px-3 py-1.5 text-sm font-bold text-primaryDark backdrop-blur transition active:scale-95 hover:bg-white/75">← 이전</button>
      <div className="my-3 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar" aria-label="설문 진행률" aria-valuemin={0} aria-valuemax={total} aria-valuenow={qIndex + 1}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
          style={{ width: `${((qIndex + 1) / total) * 100}%` }} />
      </div>
      <p className="mb-2.5 text-[13px] font-bold text-primaryDark">질문 {qIndex + 1} / {total}</p>
      <h2 className="mb-6 text-[25px] font-bold leading-snug tracking-tight">{q.title}</h2>

      {q.type === "text" ? (
        <div>
          {q.desc && <p className="-mt-2 mb-1.5 text-sm text-muted">{q.desc}</p>}
          <p className="mb-3.5 text-[13px] text-muted">(선택) 자세히 적을수록 더 정확해져요. 비워둬도 괜찮아요.</p>
          <textarea className="field-input min-h-[140px] resize-y leading-relaxed" placeholder={q.placeholder}
            aria-label={q.title} value={free} onChange={(e) => setFree(e.target.value)} />
          <button className="btn btn-primary mt-3.5" onClick={() => finish({ ...answers, freeText: free })}>진단하기</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {q.options!.map((opt) => {
            const selected = answers[q.id] === opt.v;
            return (
              <button key={opt.v} onClick={() => selectOption(q.id, opt.v)} aria-pressed={selected}
                className={`flex items-start justify-between gap-3 rounded-[14px] border p-4 text-left text-base backdrop-blur transition active:scale-[0.99] ${
                  selected ? "border-primary bg-primarySoft font-bold ring-1 ring-primary/40" : "border-white/60 bg-white/60 hover:border-primary"
                }`}>
                <span>
                  {opt.label}
                  {opt.note && <span className="mt-0.5 block text-xs font-normal text-muted">{opt.note}</span>}
                </span>
                {selected && (
                  <span className="mt-0.5 flex items-center gap-1 text-[12.5px] font-bold text-primaryDark">
                    <CheckIcon />선택됨
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
