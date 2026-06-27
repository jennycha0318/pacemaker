"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getConsentState, recordConsent } from "@/lib/consent";
import { BrandLockup } from "@/components/Logo";

export default function ConsentPage() {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [agreeSensitive, setAgreeSensitive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [err, setErr] = useState("");

  // 진입 시 — 비로그인은 로그인으로, 이미 동의했으면 진단으로 통과.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      if (!user) {
        router.replace("/login");
        return;
      }
      const c = await getConsentState(supabase, user.id);
      if (c.consented) {
        router.replace("/diagnose");
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  async function proceed() {
    if (!agree || !agreeSensitive) {
      setErr("개인정보 수집·이용과 민감정보 분석 활용에 모두 동의해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      if (user) await recordConsent(supabase, user.id);
      router.replace("/diagnose");
    } finally {
      setLoading(false);
    }
  }

  async function decline() {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // 무시
    }
    router.replace("/login");
  }

  if (checking) {
    return <div className="pt-10 text-center text-sm text-muted">불러오는 중…</div>;
  }

  return (
    <div className="pt-4 pb-8">
      <BrandLockup size={30} pastel className="mb-6" />
      <h2 className="mb-1.5 text-[26px] font-bold tracking-tight">시작하기 전에</h2>
      <p className="mb-5 text-sm text-muted">
        큐핏은 더 정확한 진단·상담을 위해 입력 정보를 저장하고 분석에 활용해요. 시작하려면 아래에 동의해 주세요.
      </p>

      <label className="mb-3 flex items-start gap-2 text-[13.5px] text-muted">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
        <span>
          <span className="font-bold text-foreground">[필수]</span>{" "}
          <Link href="/privacy" target="_blank" className="font-bold text-primaryDark underline">개인정보 수집·이용 및 데이터 활용</Link>에 동의합니다.
          이메일·닉네임·출생연도·진단 입력·채팅 상담 내용이 저장되고, 서비스 개선과 AI 분석에 활용돼요. 언제든 열람·삭제할 수 있어요.
        </span>
      </label>
      <label className="mb-1 flex items-start gap-2 text-[13.5px] text-muted">
        <input type="checkbox" checked={agreeSensitive} onChange={(e) => setAgreeSensitive(e.target.checked)} className="mt-0.5" />
        <span>
          <span className="font-bold text-foreground">[필수]</span> 연애·관계 상황 등 <b className="font-bold">민감할 수 있는 정보</b>를 진단·상담 분석에 활용하는 데 동의합니다.
        </span>
      </label>

      <p className="min-h-[18px] py-1.5 text-[13px] text-bad">{err}</p>

      <button className="btn btn-primary" onClick={proceed} disabled={loading}>
        {loading ? "처리 중…" : "동의하고 시작하기"}
      </button>
      <button className="btn btn-ghost mt-2.5 block w-full text-center" onClick={decline} disabled={loading}>
        동의하지 않고 나가기
      </button>
    </div>
  );
}
