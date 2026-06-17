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
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
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
        <h2 className="mb-1.5 mt-2 text-[23px] font-bold tracking-tight">먼저, 당신에 대해 알려주세요</h2>
        <p className="mb-6 text-sm text-muted">나이에 맞춰 더 편하게 설명하고, 결과를 개인화하는 데 써요.</p>

        <label className="mb-1.5 block text-[13px] font-bold">출생연도</label>
        <div className="mb-4"><YearSelect value={myBirthYear} onChange={setMyBirthYear} ariaLabel="내 출생연도" /></div>

        <label className="mb-1.5 block text-[13px] font-bold">내 MBTI <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-1.5"><MbtiSelect value={myMbti} onChange={setMyMbti} ariaLabel="내 MBTI" /></div>
        <p className="mb-5 text-[11.5px] text-muted">MBTI는 참고 요소예요. 몰라도 진단에는 문제없어요.</p>

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
        <h2 className="mb-1.5 mt-2 text-[23px] font-bold tracking-tight">지금 어떤 상황인가요?</h2>
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
          <p className="mt-6 text-center text-[12px] text-muted">편하게 골라줘요. 정답은 없어요.</p>
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
        <h2 className="mb-1.5 mt-2 text-[23px] font-bold tracking-tight">상대에 대해 아는 게 있나요?</h2>
        <p className="mb-6 text-sm text-muted">알면 궁합·소통 팁을 더해드려요. <b className="text-ink">몰라도 괜찮아요</b> — 건너뛰어도 진단은 똑같이 정확해요.</p>

        <label className="mb-1.5 block text-[13px] font-bold">상대 출생연도 <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-4"><YearSelect value={partnerBirthYear} onChange={setPartnerBirthYear} ariaLabel="상대 출생연도" /></div>

        <label className="mb-1.5 block text-[13px] font-bold">상대 MBTI <span className="font-normal text-muted">(선택)</span></label>
        <div className="mb-1.5"><MbtiSelect value={partnerMbti} onChange={setPartnerMbti} ariaLabel="상대 MBTI" /></div>
        <p className="mb-5 text-[11.5px] text-muted">상대 정보는 제3자 정보라 꼭 필요한 만큼만 받아요. MBTI·나이차는 참고 요소예요.</p>

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
      <button onClick={() => (qIndex > 0 ? setQIndex(qIndex - 1) : setPhase("partner"))} className="text-sm text-muted">← 이전</button>
      <div className="my-3 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar" aria-label="설문 진행률" aria-valuemin={0} aria-valuemax={total} aria-valuenow={qIndex + 1}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
          style={{ width: `${(qIndex / total) * 100}%` }} />
      </div>
      <p className="mb-2.5 text-[13px] font-bold text-primaryDark">질문 {qIndex + 1} / {total}</p>
      <h2 className="mb-6 text-[22px] font-bold leading-snug tracking-tight">{q.title}</h2>

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
          {q.options!.map((opt) => (
            <button key={opt.v} onClick={() => selectOption(q.id, opt.v)}
              className={`rounded-[14px] border p-4 text-left text-[15px] backdrop-blur transition active:scale-[0.99] ${
                answers[q.id] === opt.v ? "border-primary bg-primarySoft font-bold" : "border-white/60 bg-white/60 hover:border-primary"
              }`}>
              {opt.label}
              {opt.note && <span className="mt-0.5 block text-xs font-normal text-muted">{opt.note}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
