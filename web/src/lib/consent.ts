// 데이터 활용 동의 기록 — 동의 시점을 localStorage에 임시 보관했다가(OAuth 리다이렉트 통과용),
// 로그인 확정 후 profiles.data_consent_at 에 영속 기록(증빙). 컬럼 미생성 시 조용히 보류(다음 기회 재시도).
import type { SupabaseClient } from "@supabase/supabase-js";

const KEY = "qpit:dataConsent";

// 동의 체크 후 가입/로그인 진행 시 호출 — 동의 시각을 임시 보관(리다이렉트 후에도 살아남게).
export function markConsentPending(): void {
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    // 시크릿 모드 등 — 무시
  }
}

// 로그인 확정 후 호출 — 보류된 동의를 profiles에 영속 기록. 성공 시 임시값 제거.
export async function flushConsent(supabase: SupabaseClient, userId: string): Promise<void> {
  let ts: string | null = null;
  try {
    ts = localStorage.getItem(KEY);
  } catch {
    ts = null;
  }
  if (!ts) return;
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, data_consent_at: ts, data_consent_sensitive: true, updated_at: new Date().toISOString() });
    if (!error) {
      try {
        localStorage.removeItem(KEY);
      } catch {
        // 무시
      }
    }
    // 컬럼 미생성(error) → 임시값 유지, 다음 진입 때 재시도
  } catch {
    // 무시 — 다음 기회에
  }
}
