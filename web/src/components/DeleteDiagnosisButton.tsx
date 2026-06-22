"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteDiagnosisButton({
  id,
  redirectTo,
}: {
  id: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    if (!window.confirm("이 진단 기록을 삭제할까요? 되돌릴 수 없어요.")) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("diagnoses")
      .delete()
      .eq("id", id);

    if (delError) {
      setLoading(false);
      setError("삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        aria-label="기록 삭제"
        className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-bad/10 hover:text-bad disabled:opacity-50"
      >
        {loading ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.2-8.5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2m-9 0v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6M10 11v6M14 11v6" />
          </svg>
        )}
      </button>
      {error ? <span className="text-[12.5px] text-bad">{error}</span> : null}
    </span>
  );
}
