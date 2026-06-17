// 사용자 프로필 읽기/저장 — profiles 테이블 우선, user_metadata 폴백(가입 직후/콜백 타이밍 안전).
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Profile {
  birthYear: number | null;
  mbti: string | null;
  attachment: string | null;
  name: string | null;
}

export async function getProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let row: { birth_year: number | null; mbti: string | null; attachment: string | null } | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("birth_year, mbti, attachment")
      .eq("id", user.id)
      .maybeSingle();
    row = data ?? null;
  } catch {
    row = null; // 테이블 미생성 등 — 메타데이터로 폴백
  }
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v ? parseInt(v, 10) : null);
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    birthYear: row?.birth_year ?? num(md.birth_year),
    mbti: row?.mbti ?? str(md.mbti),
    attachment: row?.attachment ?? str(md.attachment),
    name: str(md.name),
  };
}

export async function saveProfile(
  supabase: SupabaseClient,
  patch: { birthYear?: number | null; mbti?: string | null; attachment?: string | null },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
  const row: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString() };
  if (patch.birthYear !== undefined) row.birth_year = patch.birthYear;
  if (patch.mbti !== undefined) row.mbti = patch.mbti || null;
  if (patch.attachment !== undefined) row.attachment = patch.attachment || null;
  const { error } = await supabase.from("profiles").upsert(row);
  if (error) throw error;
  // 메타데이터에도 동기화(폴백·표시용)
  try {
    await supabase.auth.updateUser({ data: { ...patch.birthYear !== undefined ? { birth_year: patch.birthYear } : {}, ...patch.mbti !== undefined ? { mbti: patch.mbti || null } : {}, ...patch.attachment !== undefined ? { attachment: patch.attachment || null } : {} } });
  } catch {
    // 메타 동기화 실패는 무시(테이블 저장이 우선)
  }
}
