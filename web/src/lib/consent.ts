// 데이터 활용 동의 — 인증 직후 1회 동의 화면(/consent)에서 받고 profiles에 영속 기록(증빙).
// 로그인/가입 화면엔 체크박스를 두지 않고, 미동의 사용자만 게이트로 보낸다.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConsentState {
  known: boolean;     // 동의 여부를 확정할 수 있었나(컬럼 미생성=SQL 미실행 시 false)
  consented: boolean; // data_consent_at 기록이 있나
}

// 동의 여부 확인. 컬럼 미생성 등으로 확인 불가하면 known=false → 게이트는 통과시킨다(lockout 방지).
export async function getConsentState(supabase: SupabaseClient, userId: string): Promise<ConsentState> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("data_consent_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) return { known: false, consented: false }; // 컬럼 미생성 등 — 판단 보류
    return { known: true, consented: !!(data && data.data_consent_at) };
  } catch {
    return { known: false, consented: false };
  }
}

// 동의 기록(증빙). 컬럼 미생성 시 graceful 실패(차단하지 않음 — SQL 실행 후 다음 동의부터 기록).
export async function recordConsent(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    await supabase.from("profiles").upsert({
      id: userId,
      data_consent_at: new Date().toISOString(),
      data_consent_sensitive: true,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // 무시
  }
}
