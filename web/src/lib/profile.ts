// 사용자 프로필 읽기/저장 — profiles 테이블 우선(SoT), user_metadata 폴백(가입 직후/콜백 타이밍 안전).
// 닉네임·상대 정보도 테이블에 저장해 영속화(메타데이터만 쓰면 OAuth 재로그인 시 날아갈 수 있음).
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Profile {
  birthYear: number | null;
  mbti: string | null;
  attachment: string | null;
  name: string | null;     // 로그인 이름(고정, 변경 불가) — auth.users user_metadata.name
  nickname: string | null; // 여기서 활동에 쓰는 닉네임(편집 가능) — profiles.nickname 우선
  // 마지막에 입력한 상대 정보(다음 진단 자동 채움용) — 카톡 캡처는 저장 안 함
  partnerBirthYear: number | null;
  partnerMbti: string | null;
  partnerNote: string | null;
}

export async function getProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let row:
    | { birth_year: number | null; mbti: string | null; attachment: string | null; nickname: string | null; partner_birth_year: number | null; partner_mbti: string | null; partner_note: string | null }
    | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("birth_year, mbti, attachment, nickname, partner_birth_year, partner_mbti, partner_note")
      .eq("id", user.id)
      .maybeSingle();
    row = data ?? null;
  } catch {
    row = null; // 테이블/컬럼 미생성 등 — 메타데이터로 폴백
  }
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v ? parseInt(v, 10) : null);
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    birthYear: row?.birth_year ?? num(md.birth_year),
    mbti: row?.mbti ?? str(md.mbti),
    attachment: row?.attachment ?? str(md.attachment),
    name: str(md.name),
    nickname: str(row?.nickname) ?? str(md.nickname), // 테이블 우선, 없으면 메타데이터(이전 데이터 호환)
    partnerBirthYear: row?.partner_birth_year ?? num(md.partner_birth_year),
    partnerMbti: str(row?.partner_mbti) ?? str(md.partner_mbti),
    partnerNote: str(row?.partner_note) ?? str(md.partner_note),
  };
}

export async function saveProfile(
  supabase: SupabaseClient,
  patch: {
    birthYear?: number | null; mbti?: string | null; attachment?: string | null; nickname?: string | null;
    partnerBirthYear?: number | null; partnerMbti?: string | null; partnerNote?: string | null;
  },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");

  // 변경된 필드만 모음(테이블 컬럼명 기준).
  const fields: Record<string, unknown> = {};
  if (patch.birthYear !== undefined) fields.birth_year = patch.birthYear;
  if (patch.mbti !== undefined) fields.mbti = patch.mbti || null;
  if (patch.attachment !== undefined) fields.attachment = patch.attachment || null;
  if (patch.nickname !== undefined) fields.nickname = patch.nickname || null;
  if (patch.partnerBirthYear !== undefined) fields.partner_birth_year = patch.partnerBirthYear;
  if (patch.partnerMbti !== undefined) fields.partner_mbti = patch.partnerMbti || null;
  if (patch.partnerNote !== undefined) fields.partner_note = patch.partnerNote || null;

  // 1) 메타데이터 동기화 (즉시 가용·폴백) — 로그인 이름 metadata.name은 건드리지 않음
  let metaOk = false;
  try {
    const { error } = await supabase.auth.updateUser({ data: fields });
    metaOk = !error;
  } catch {
    metaOk = false;
  }

  // 2) profiles 테이블 저장 (SoT, 영속). 신규 컬럼(nickname/partner_*) 미마이그레이션 시 핵심 컬럼만 재시도.
  const rowFull: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString(), ...fields };
  let tableOk = false;
  try {
    const { error } = await supabase.from("profiles").upsert(rowFull);
    if (!error) {
      tableOk = true;
    } else {
      const core: Record<string, unknown> = { id: user.id, updated_at: rowFull.updated_at };
      for (const k of ["birth_year", "mbti", "attachment"]) if (k in rowFull) core[k] = rowFull[k];
      if (Object.keys(core).length > 2) {
        const { error: e2 } = await supabase.from("profiles").upsert(core);
        tableOk = !e2;
      }
    }
  } catch {
    tableOk = false;
  }

  if (!metaOk && !tableOk) throw new Error("프로필 저장에 실패했어요.");
}
