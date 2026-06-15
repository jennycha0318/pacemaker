import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.name as string) || user?.email?.split("@")[0] || "사용자";

  return (
    <div>
      <div className="py-5">
        <p className="text-[15px] text-muted">안녕하세요,</p>
        <h2 className="my-0.5 text-[26px] font-bold tracking-tight">{name}님</h2>
        <p className="text-sm text-muted">오늘은 어떤 고민이 있으신가요?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/diagnose" className="col-span-2 flex min-h-[96px] flex-col gap-1 rounded-2xl bg-gradient-to-br from-primary to-primaryDark p-[18px] text-white">
          <span className="text-base font-bold">새 진단 시작</span>
          <span className="text-[12.5px] text-white/85">썸·연애·재회 타이밍 분석</span>
        </Link>
        <Link href="/history" className="flex min-h-[96px] flex-col gap-1 rounded-2xl border-[1.5px] border-line bg-surface p-[18px] hover:border-primary">
          <span className="text-base font-bold">진단 히스토리</span>
          <span className="text-[12.5px] text-muted">지난 진단 다시 보기</span>
        </Link>
        <Link href="/profile" className="flex min-h-[96px] flex-col gap-1 rounded-2xl border-[1.5px] border-line bg-surface p-[18px] hover:border-primary">
          <span className="text-base font-bold">내 프로필</span>
          <span className="text-[12.5px] text-muted">계정 · 로그아웃</span>
        </Link>
        <div className="col-span-2 flex min-h-[64px] flex-col justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-line bg-surface/50 p-[18px] opacity-70">
          <span className="text-sm font-bold text-muted">받은 메시지 해석 · 캡처 분석 (준비 중)</span>
        </div>
      </div>
    </div>
  );
}
