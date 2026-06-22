"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PwToggle } from "@/components/PwToggle";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null); // 복구 세션 유효 여부
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const pwHint = pw && pw.length < 6 ? "비밀번호는 6자 이상이어야 해요." : "";
  const pw2Hint = pw2 && pw !== pw2 ? "두 비밀번호가 일치하지 않아요." : "";

  useEffect(() => {
    // 비밀번호 재설정 링크를 통해 들어온 경우에만 세션이 있음
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => setReady(!!user))
      .catch(() => setReady(false));
  }, []);

  // 변경 성공 후 이동 (언마운트 시 타이머 정리)
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => router.push("/diagnose"), 1200);
    return () => clearTimeout(t);
  }, [ok, router]);

  async function update() {
    setErr(""); setOk("");
    if (!ready) return setErr("세션이 유효하지 않아요. 재설정 링크로 다시 들어와 주세요.");
    if (pw.length < 6) return setErr("비밀번호는 6자 이상이어야 해요.");
    if (pw !== pw2) return setErr("두 비밀번호가 일치하지 않아요.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) return setErr(error.message);
      setOk("비밀번호가 변경됐어요. 잠시 후 이동합니다.");
    } catch {
      setErr("네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (ready === false) {
    return (
      <div className="pt-4">
        <h2 className="mb-1.5 text-[30px] font-bold tracking-tight">링크가 만료됐어요</h2>
        <p className="mb-6 text-sm text-muted">비밀번호 재설정 링크가 유효하지 않거나 만료됐습니다. 다시 시도해 주세요.</p>
        <Link href="/reset-password" className="btn btn-primary block text-center">재설정 링크 다시 받기</Link>
        <Link href="/login" className="btn btn-ghost mt-3 block text-center">로그인으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h2 className="mb-1.5 text-[30px] font-bold tracking-tight">새 비밀번호 설정</h2>
      <p className="mb-6 text-sm text-muted">사용할 새 비밀번호를 입력해 주세요.</p>
      <label htmlFor="up-pw" className="mb-1.5 block text-[13px] font-bold">새 비밀번호</label>
      <div className="relative">
        <input id="up-pw" autoComplete="new-password" className="field-input pr-11" type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상" />
        <PwToggle shown={showPw} onClick={() => setShowPw((v) => !v)} />
      </div>
      <p className="min-h-[18px] mb-2 pt-1 text-[12.5px] text-warn">{pwHint}</p>
      <label htmlFor="up-pw2" className="mb-1.5 block text-[13px] font-bold">새 비밀번호 확인</label>
      <div className="relative">
        <input id="up-pw2" autoComplete="new-password" className="field-input pr-11" type={showPw2 ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="다시 입력"
          onKeyDown={(e) => e.key === "Enter" && update()} />
        <PwToggle shown={showPw2} onClick={() => setShowPw2((v) => !v)} />
      </div>
      <p className="min-h-[18px] pt-1 text-[12.5px] text-warn">{pw2Hint}</p>
      <p className="min-h-[18px] py-1.5 text-[13px] text-bad">{err}</p>
      {ok && <p className="mb-2 text-[13px] text-good">{ok}</p>}
      <button className="btn btn-primary" onClick={update} disabled={loading || ready === null}>
        {loading ? "변경 중…" : "비밀번호 변경"}
      </button>
    </div>
  );
}
