-- 큐핏 Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

-- 진단 결과 (사용자별)
create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stage text not null,                 -- crush | dating | breakup
  score int not null,                  -- 진단 점수 (엔진이 3~97로 clamp; 컬럼엔 CHECK 제약 없음)
  result jsonb not null,               -- 진단 결과 전체 (Diagnosis)
  created_at timestamptz not null default now()
);

-- 행 수준 보안: 본인 데이터만 접근
alter table public.diagnoses enable row level security;

create policy "diagnoses_select_own"
  on public.diagnoses for select
  using (auth.uid() = user_id);

create policy "diagnoses_insert_own"
  on public.diagnoses for insert
  with check (auth.uid() = user_id);

create policy "diagnoses_delete_own"
  on public.diagnoses for delete
  using (auth.uid() = user_id);

create index if not exists diagnoses_user_created
  on public.diagnoses (user_id, created_at desc);

-- 사용자 프로필 (영속 입력: 생년·MBTI·애착유형) — 진단 개인화/안전(청소년) 판정용
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  birth_year int,                      -- 출생연도 (청소년/성인 판정·나이차 참고)
  mbti text,                           -- 4글자 MBTI 또는 null(비공개/모름)
  attachment text,                     -- secure | anxious | avoidant | null
  nickname text,                       -- 활동 닉네임(편집 가능). 로그인 이름은 auth.users에 보관.
  partner_birth_year int,              -- 마지막 입력 상대 정보(다음 진단 자동 채움). 카톡 캡처는 저장 안 함.
  partner_mbti text,
  partner_note text,
  updated_at timestamptz not null default now()
);

-- 기존 profiles 테이블에 컬럼이 없으면 추가(메타데이터→테이블로 이전해 영속화)
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists partner_birth_year int;
alter table public.profiles add column if not exists partner_mbti text;
alter table public.profiles add column if not exists partner_note text;
-- 데이터 활용 동의 기록(증빙): 동의 시각 + 민감정보 분석 활용 동의 여부
alter table public.profiles add column if not exists data_consent_at timestamptz;
alter table public.profiles add column if not exists data_consent_sensitive boolean;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- 진단별 상담(챗봇) 기록 — 메시지당 Q&A 누적. 히스토리에서 결과와 함께 표시.
create table if not exists public.diagnosis_chats (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid references public.diagnoses (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  q text not null,                     -- 사용자 질문
  a text not null,                     -- 큐핏 답변
  created_at timestamptz not null default now()
);

alter table public.diagnosis_chats enable row level security;

-- 정책은 재실행 시 중복 에러가 나므로 drop-if-exists 후 생성(idempotent)
drop policy if exists "diagnosis_chats_select_own" on public.diagnosis_chats;
create policy "diagnosis_chats_select_own"
  on public.diagnosis_chats for select
  using (auth.uid() = user_id);

drop policy if exists "diagnosis_chats_insert_own" on public.diagnosis_chats;
create policy "diagnosis_chats_insert_own"
  on public.diagnosis_chats for insert
  with check (auth.uid() = user_id);

drop policy if exists "diagnosis_chats_delete_own" on public.diagnosis_chats;
create policy "diagnosis_chats_delete_own"
  on public.diagnosis_chats for delete
  using (auth.uid() = user_id);

create index if not exists diagnosis_chats_diag
  on public.diagnosis_chats (diagnosis_id, created_at);

-- 진단 결과 회수(예측 검증 + 사후 체크인) — 재방문 시 '맞았나요/어떻게 됐어요' 기록. 추천(NPS) 정점 포착용.
create table if not exists public.diagnosis_outcomes (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid references public.diagnoses (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,                  -- 'prediction'(예측 적중) | 'checkin'(사후 결과)
  value text not null,                 -- correct|partial|wrong  또는  good|soso|bad
  created_at timestamptz not null default now()
);

alter table public.diagnosis_outcomes enable row level security;

drop policy if exists "diagnosis_outcomes_select_own" on public.diagnosis_outcomes;
create policy "diagnosis_outcomes_select_own"
  on public.diagnosis_outcomes for select
  using (auth.uid() = user_id);

drop policy if exists "diagnosis_outcomes_insert_own" on public.diagnosis_outcomes;
create policy "diagnosis_outcomes_insert_own"
  on public.diagnosis_outcomes for insert
  with check (auth.uid() = user_id);

drop policy if exists "diagnosis_outcomes_delete_own" on public.diagnosis_outcomes;
create policy "diagnosis_outcomes_delete_own"
  on public.diagnosis_outcomes for delete
  using (auth.uid() = user_id);

create index if not exists diagnosis_outcomes_diag
  on public.diagnosis_outcomes (diagnosis_id, created_at);
