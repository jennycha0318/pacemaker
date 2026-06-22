"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/GoogleButton";
import { YearSelect, MbtiSelect } from "@/components/InfoFields";
import { saveProfile } from "@/lib/profile";
import { BrandLockup } from "@/components/Logo";
import { PwToggle } from "@/components/PwToggle";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [birthYear, setBirthYear] = useState("");
  const [mbti, setMbti] = useState("");
  const [showPw, setShowPw] = useState(false);

  const emailHint = email && !EMAIL_RE.test(email) ? "이메일 형식을 확인해 주세요. (예: you@example.com)" : "";
  const pwHint = pw && pw.length < 6 ? "비밀번호는 6자 이상이어야 해요." : "";

  async function signup() {
    setErr(""); setOk("");
    if (!name.trim()) return setErr("이름(닉네임)을 입력해 주세요.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("올바른 이메일을 입력해 주세요.");
    if (pw.length < 6) return setErr("비밀번호는 6자 이상이어야 해요.");
    if (!birthYear) return setErr("출생연도를 선택해 주세요.");
    if (!agree) return setErr("개인정보 수집·이용에 동의해 주세요.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: { name, birth_year: Number(birthYear), mbti: mbti || null },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) return setErr(error.message);
      // 이메일 인증이 꺼져 있으면 즉시 세션 생성됨 → 프로필 저장 후 진단으로
      if (data.session) {
        try {
          await saveProfile(supabase, { birthYear: Number(birthYear), mbti: mbti || null });
        } catch {
          // 프로필 저장 실패해도 메타데이터에 남아있어 추후 백필됨
        }
        router.push("/diagnose");
      } else {
        setOk("가입 확인 메일을 보냈어요. 메일의 링크를 눌러 인증을 완료해 주세요.");
      }
    } catch {
      setErr("네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-4">
      <BrandLockup size={30} className="mb-6" />
      <h2 className="mb-1.5 text-[30px] font-bold tracking-tight">회원가입</h2>
      <p className="mb-6 text-sm text-muted">이메일로 가입하거나 Google을 사용하세요.</p>

      <GoogleButton />
      <p className="mt-1.5 text-center text-[12.5px] text-muted">Google로 가입 시 계정 이름이 닉네임으로 저장돼요.</p>
      <div className="my-[18px] flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        <span>또는 이메일로</span>
      </div>

      <label htmlFor="su-name" className="mb-1.5 block text-[13px] font-bold">이름(닉네임)</label>
      <input id="su-name" autoComplete="name" className="field-input mb-3.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 지은" />
      <label htmlFor="su-email" className="mb-1.5 block text-[13px] font-bold">이메일</label>
      <input id="su-email" autoComplete="email" className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <p className="min-h-[18px] pt-1 text-[12.5px] text-warn">{emailHint}</p>
      <label htmlFor="su-pw" className="mb-1.5 mt-1.5 block text-[13px] font-bold">비밀번호</label>
      <div className="relative">
        <input id="su-pw" autoComplete="new-password" className="field-input pr-11" type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상" />
        <PwToggle shown={showPw} onClick={() => setShowPw((v) => !v)} />
      </div>
      <p className="min-h-[18px] mb-2 pt-1 text-[12.5px] text-warn">{pwHint}</p>

      <label className="mb-1.5 block text-[13px] font-bold">출생연도</label>
      <div className="mb-3.5"><YearSelect value={birthYear} onChange={setBirthYear} ariaLabel="출생연도" /></div>

      <label className="mb-1.5 block text-[13px] font-bold">MBTI <span className="font-normal text-muted">(선택)</span></label>
      <div className="mb-1.5"><MbtiSelect value={mbti} onChange={setMbti} ariaLabel="내 MBTI" /></div>
      <p className="mb-1 text-[12.5px] text-muted">진단 개인화와 청소년 보호 판정에 쓰여요. MBTI는 참고 요소예요.</p>

      <p className="min-h-[18px] py-1.5 text-[13px] text-bad">{err}</p>
      {ok && <p className="mb-2 text-[13px] text-good">{ok}</p>}

      <label className="mb-3 flex items-start gap-2 text-[13px] text-muted">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
        <span>
          <Link href="/privacy" target="_blank" className="font-bold text-primaryDark underline">개인정보 수집·이용</Link>에 동의합니다.
          이메일·닉네임·출생연도와 (선택)MBTI·진단 입력이 저장되며, 자유서술은 추후 AI 분석에 활용될 수 있어요.
        </span>
      </label>

      <button className="btn btn-primary" onClick={signup} disabled={loading}>
        {loading ? "가입 중…" : "가입하기"}
      </button>

      <div className="mt-4 flex justify-center gap-2 text-sm">
        <span className="text-muted">이미 계정이 있나요?</span>
        <Link href="/login" className="font-bold text-primaryDark">로그인</Link>
      </div>
    </div>
  );
}
