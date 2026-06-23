import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Report } from "@/components/Report";
import { DeleteDiagnosisButton } from "@/components/DeleteDiagnosisButton";
import type { Diagnosis } from "@/lib/diagnose/engine";
import { STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";

export const dynamic = "force-dynamic";

function fmt(ts: string) {
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagnoses")
    .select("stage, result, created_at")
    .eq("id", id)
    .single();

  if (error || !data || !data.result || typeof data.result !== "object") notFound();
  const d = data.result as Diagnosis;
  // 필수 필드 누락(깨진 데이터)이면 Report 크래시 대신 404
  if (typeof d.score !== "number" || !d.plan || !Array.isArray(d.factors)) notFound();

  // 이 진단에 대한 상담(챗봇) 기록 — 테이블/권한 없으면 null → 조용히 미표시
  const { data: chats } = await supabase
    .from("diagnosis_chats")
    .select("q, a, created_at")
    .eq("diagnosis_id", id)
    .order("created_at", { ascending: true });
  const chatList = (chats ?? []) as { q: string; a: string; created_at: string }[];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Link href="/history" className="inline-flex items-center gap-1 rounded-full bg-white/55 px-3 py-1.5 text-sm font-bold text-primaryDark backdrop-blur">← 히스토리</Link>
        <DeleteDiagnosisButton id={id} redirectTo="/history" />
      </div>
      <p className="mb-3 mt-3 text-[13px] text-muted">
        {STAGE_LABEL[data.stage as Stage] ?? "진단"} · {fmt(data.created_at as string)}
      </p>
      <Report d={d} diagnosisId={id} />

      {chatList.length > 0 && (
        <section className="mt-7">
          <p className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">상담 기록</p>
          <div className="flex flex-col gap-3">
            {chatList.map((c, i) => (
              <div key={i} className="card">
                <p className="mb-2 flex gap-1.5 text-[13.5px]">
                  <span className="font-bold text-primaryDark">Q.</span>
                  <span>{c.q}</span>
                </p>
                <p className="flex gap-1.5 text-[14px]">
                  <span className="font-bold text-accent">A.</span>
                  <span className="whitespace-pre-wrap leading-relaxed">{c.a}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
