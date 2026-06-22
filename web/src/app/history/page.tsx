import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";
import type { Diagnosis } from "@/lib/diagnose/engine";
import { DeleteDiagnosisButton } from "@/components/DeleteDiagnosisButton";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  stage: Stage;
  score: number;
  result: Diagnosis;
  created_at: string;
}

function fmt(ts: string) {
  // 서버 타임존(Vercel=UTC)과 무관하게 한국 시간으로 표시
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagnoses")
    .select("id, stage, score, result, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div>
        <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">진단 히스토리</h2>
        <div className="card text-center text-sm text-muted">
          기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </div>
      </div>
    );
  }
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">진단 히스토리</h2>
      <p className="mb-5 text-sm text-muted">지난 진단 결과를 다시 볼 수 있어요.</p>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primarySoft text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" />
            </svg>
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">아직 진단 기록이 없어요</p>
            <p className="mt-1 text-[13px] text-muted">첫 진단을 하면 지난 결과를 다시 볼 수 있어요.</p>
          </div>
          <Link href="/diagnose" className="btn btn-primary mt-1 max-w-[220px]">첫 진단 시작하기</Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const color = r.score >= 65 ? "#4fa3a2" : r.score >= 45 ? "#c79a4e" : "#b96b8f";
            return (
              <li key={r.id} className="relative">
                <Link href={`/history/${r.id}`} className="flex items-center gap-3.5 rounded-[18px] border border-white/60 bg-white/55 py-3.5 pl-4 pr-12 backdrop-blur transition active:scale-[0.98] hover:border-primary">
                  <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl text-lg font-bold"
                    style={{ color, background: `${color}1a` }}>{r.score}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="text-[14.5px]">{STAGE_LABEL[r.stage] ?? "진단"} · {r.result?.scoreTitle ?? "결과"}</b>
                    <span className="text-[12.5px] text-primaryDark">{r.result?.plan?.when ?? ""}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-ink/70">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" />
                      </svg>
                      {fmt(r.created_at)}
                    </span>
                  </span>
                </Link>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <DeleteDiagnosisButton id={r.id} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
