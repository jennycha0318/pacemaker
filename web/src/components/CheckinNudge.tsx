"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";

// 재방문 체크인 넛지(T10 v1: 앱 내) — 예측이 있는 지난 진단(5~45일 경과)에 아직 '맞았나요?'
// 응답이 없으면 진단 첫 화면 상단에 카드로 띄워 검증 루프(diagnosis_outcomes)를 닫는다.
// 이 데이터가 적중률 측정·재진단 개인화(prevInsight)의 연료.
type Due = { id: string; stage: Stage; days: number; prediction: string };

export function CheckinNudge() {
  const [due, setDue] = useState<Due | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return; // 비로그인 — 표시 안 함
        const { data: rows } = await supabase
          .from("diagnoses")
          .select("id, stage, created_at, result")
          .order("created_at", { ascending: false })
          .limit(5);
        const list = (rows ?? []) as { id: string; stage: Stage; created_at: string; result?: { prediction?: string } }[];
        const withPred = list.filter((r) => (r.result?.prediction ?? "").trim());
        if (!withPred.length) return;
        const { data: outs } = await supabase
          .from("diagnosis_outcomes")
          .select("diagnosis_id")
          .eq("kind", "prediction")
          .in("diagnosis_id", withPred.map((r) => r.id));
        const answered = new Set((outs ?? []).map((o) => (o as { diagnosis_id: string }).diagnosis_id));
        const now = Date.now();
        const hit = withPred.find((r) => {
          if (answered.has(r.id)) return false;
          const days = Math.floor((now - new Date(r.created_at).getTime()) / 86400000);
          return days >= 5 && days <= 45; // 예측 검증 가능 시기(너무 이르거나 뒤늦은 건 제외)
        });
        if (hit) {
          setDue({
            id: hit.id,
            stage: hit.stage,
            days: Math.floor((now - new Date(hit.created_at).getTime()) / 86400000),
            prediction: (hit.result?.prediction ?? "").slice(0, 70),
          });
        }
      } catch {
        // 테이블 미생성 등 — 조용히 스킵
      }
    })();
  }, []);

  if (!due) return null;
  return (
    <Link
      href={`/history/${due.id}`}
      className="mb-5 block rounded-2xl border border-accent/50 bg-accent/10 p-4 transition active:scale-[0.98] hover:bg-accent/15"
    >
      <p className="text-[12px] font-bold uppercase tracking-wide text-primaryDark">그 뒤 어떻게 됐어요?</p>
      <p className="mt-1.5 text-sm font-bold text-ink">
        {due.days}일 전 {STAGE_LABEL[due.stage] ?? ""} 진단 — 큐핏의 예측, 맞았나요?
      </p>
      <p className="mt-1 truncate text-[12.5px] text-muted">“{due.prediction}…”</p>
      <p className="mt-2 text-[13px] font-bold text-primaryDark">확인하고 알려주기 →</p>
    </Link>
  );
}
