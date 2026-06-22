"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteAllDataButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function deleteAll() {
    setErr("");
    if (!window.confirm("내 진단 기록을 모두 삭제할까요? 되돌릴 수 없어요.")) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErr("로그인 정보를 확인할 수 없어요. 다시 시도해 주세요.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.from("diagnoses").delete().eq("user_id", user.id);
      if (error) {
        setErr("삭제에 실패했어요. 다시 시도해 주세요.");
        setLoading(false);
        return;
      }
      setDone(true);
      setLoading(false);
      router.refresh();
    } catch {
      setErr("삭제에 실패했어요. 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        className="btn btn-ghost mt-[18px] text-bad"
        onClick={deleteAll}
        disabled={loading}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mr-1.5 inline-block align-[-2px]"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
        {loading ? "삭제 중…" : "내 진단 기록 전체 삭제"}
      </button>
      <p className="mt-2 px-1 text-[12.5px] text-muted">
        기록만 삭제돼요. 계정 자체는 유지됩니다.
      </p>
      {err && <p className="mt-2 text-[13px] text-bad">{err}</p>}
      {done && (
        <p className="mt-2 text-[13px] text-good">진단 기록을 모두 삭제했어요.</p>
      )}
    </div>
  );
}
