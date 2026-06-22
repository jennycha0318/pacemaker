"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STAGE_LABEL, type Stage } from "@/lib/diagnose/survey";
import type { Diagnosis } from "@/lib/diagnose/engine";
import { DeleteDiagnosisButton } from "@/components/DeleteDiagnosisButton";
import { scoreColor } from "@/lib/diagnose/colors";

export interface Row {
  id: string;
  stage: Stage;
  score: number;
  result: Diagnosis | any;
  created_at: string;
}

type Filter = "all" | Stage;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "crush", label: STAGE_LABEL.crush },
  { value: "dating", label: STAGE_LABEL.dating },
  { value: "breakup", label: STAGE_LABEL.breakup },
];

const GROUP_ORDER = ["오늘", "이번 주", "이번 달", "그 이전"] as const;
type GroupKey = (typeof GROUP_ORDER)[number];

function fmt(ts: string) {
  // 서버 타임존(Vercel=UTC)과 무관하게 한국 시간으로 표시
  return new Date(ts).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// KST 기준 자정으로 정규화한 Date 반환
function kstMidnight(d: Date) {
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  kst.setHours(0, 0, 0, 0);
  return kst;
}

function groupOf(ts: string, now: Date): GroupKey {
  const created = kstMidnight(new Date(ts));
  const today = kstMidnight(now);
  const diffDays = Math.round((today.getTime() - created.getTime()) / 86400000);

  if (diffDays <= 0) return "오늘";

  // 이번 주: 일요일 시작 기준 같은 주
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  if (created.getTime() >= weekStart.getTime()) return "이번 주";

  // 이번 달
  if (
    created.getFullYear() === today.getFullYear() &&
    created.getMonth() === today.getMonth()
  ) {
    return "이번 달";
  }

  return "그 이전";
}

export function HistoryList({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.stage === filter)),
    [rows, filter]
  );

  const groups = useMemo(() => {
    const now = new Date();
    const map = new Map<GroupKey, Row[]>();
    for (const r of filtered) {
      const key = groupOf(r.created_at, now);
      const arr = map.get(key);
      if (arr) arr.push(r);
      else map.set(key, [r]);
    }
    return GROUP_ORDER.filter((k) => map.has(k)).map((k) => ({
      key: k,
      items: map.get(k)!,
    }));
  }, [filtered]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition active:scale-[0.97] ${
                active
                  ? "border-primary/40 bg-primarySoft text-primaryDark"
                  : "border-white/60 bg-white/55 text-muted backdrop-blur hover:border-primary"
              }`}
              aria-pressed={active}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          해당 조건의 기록이 없어요.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className="mb-2 text-[12.5px] font-bold text-muted">{g.key}</h3>
              <ul className="flex flex-col gap-2.5">
                {g.items.map((r) => {
                  const color = scoreColor(r.score);
                  return (
                    <li key={r.id} className="relative">
                      <Link
                        href={`/history/${r.id}`}
                        className="flex items-center gap-3.5 rounded-[18px] border border-white/60 bg-white/55 py-3.5 pl-4 pr-12 backdrop-blur transition active:scale-[0.98] hover:border-primary"
                      >
                        <span
                          className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl text-lg font-bold"
                          style={{ color, background: `${color}1a` }}
                        >
                          {r.score}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <b className="text-[14.5px]">
                            {STAGE_LABEL[r.stage] ?? "진단"} · {r.result?.scoreTitle ?? "결과"}
                          </b>
                          <span className="text-[12.5px] text-primaryDark">
                            {r.result?.plan?.when ?? ""}
                          </span>
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
