"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SURVEYS, type Stage } from "@/lib/diagnose/survey";
import { diagnose, type Answers, type Diagnosis } from "@/lib/diagnose/engine";
import { Report } from "@/components/Report";

const STAGES: { v: Stage; emoji: string; name: string; note: string }[] = [
  { v: "crush", emoji: "🌱", name: "썸 타는 중", note: "고백 타이밍이 고민돼요" },
  { v: "dating", emoji: "💞", name: "연애 중", note: "관계가 불안해요" },
  { v: "breakup", emoji: "🔁", name: "이별 후", note: "재회하고 싶어요" },
];

export default function DiagnosePage() {
  const [phase, setPhase] = useState<"stage" | "survey" | "result">("stage");
  const [stage, setStage] = useState<Stage>("crush");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [free, setFree] = useState("");
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [saving, setSaving] = useState(false);

  function pickStage(s: Stage) {
    setStage(s); setAnswers({}); setQIndex(0); setFree(""); setPhase("survey");
  }

  async function finish(ans: Answers) {
    const d = diagnose(stage, ans);
    setResult(d);
    setPhase("result");
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("diagnoses").insert({ stage, score: d.score, result: d });
    } catch {
      // 저장 실패해도 결과는 표시
    } finally {
      setSaving(false);
    }
  }

  function selectOption(qid: string, v: string) {
    const next = { ...answers, [qid]: v };
    setAnswers(next);
    const survey = SURVEYS[stage];
    setTimeout(() => {
      if (qIndex < survey.length - 1) setQIndex(qIndex + 1);
      else finish(next);
    }, 200);
  }

  function reset() {
    setPhase("stage"); setAnswers({}); setQIndex(0); setResult(null); setFree("");
  }

  // ── 상황 선택 ──
  if (phase === "stage") {
    return (
      <div>
        <Link href="/home" className="text-sm text-muted">← 홈</Link>
        <h2 className="mb-1.5 mt-2 text-[23px] font-bold tracking-tight">지금 어떤 상황인가요?</h2>
        <p className="mb-6 text-sm text-muted">상황에 맞춰 질문이 달라집니다.</p>
        <div className="flex flex-col gap-3.5">
          {STAGES.map((s) => (
            <button key={s.v} onClick={() => pickStage(s.v)}
              className="flex items-center gap-4 rounded-[18px] border-[1.5px] border-line bg-surface p-5 text-left hover:border-primary">
              <span className="text-[34px]">{s.emoji}</span>
              <span>
                <span className="block text-lg font-bold">{s.name}</span>
                <span className="block text-[13px] text-muted">{s.note}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── 결과 ──
  if (phase === "result" && result) {
    return (
      <div>
        <p className="mb-3 text-center text-xs text-muted">{saving ? "결과 저장 중…" : "히스토리에 저장됨"}</p>
        <Report d={result} />
        <button className="btn btn-ghost mt-5" onClick={reset}>다시 진단하기</button>
        <Link href="/home" className="btn btn-ghost mt-3 block text-center">홈으로</Link>
      </div>
    );
  }

  // ── 설문 ──
  const survey = SURVEYS[stage];
  const q = survey[qIndex];
  const total = survey.length;

  return (
    <div>
      <button onClick={() => (qIndex > 0 ? setQIndex(qIndex - 1) : reset())} className="text-sm text-muted">← 이전</button>
      <div className="my-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6fd6] transition-all"
          style={{ width: `${(qIndex / total) * 100}%` }} />
      </div>
      <p className="mb-2.5 text-[13px] font-bold text-primaryDark">질문 {qIndex + 1} / {total}</p>
      <h2 className="mb-6 text-[22px] font-bold leading-snug tracking-tight">{q.title}</h2>

      {q.type === "text" ? (
        <div>
          {q.desc && <p className="-mt-2 mb-3.5 text-sm text-muted">{q.desc}</p>}
          <textarea className="field-input min-h-[140px] resize-y leading-relaxed" placeholder={q.placeholder}
            value={free} onChange={(e) => setFree(e.target.value)} />
          <button className="btn btn-primary mt-3.5" onClick={() => finish({ ...answers, freeText: free })}>진단 받기</button>
          <button className="btn btn-ghost mt-2.5" onClick={() => finish({ ...answers, freeText: "" })}>건너뛰고 진단하기</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {q.options!.map((opt) => (
            <button key={opt.v} onClick={() => selectOption(q.id, opt.v)}
              className={`rounded-[14px] border-[1.5px] p-4 text-left text-[15px] transition ${
                answers[q.id] === opt.v ? "border-primary bg-primarySoft font-bold" : "border-line bg-surface hover:border-primary"
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
