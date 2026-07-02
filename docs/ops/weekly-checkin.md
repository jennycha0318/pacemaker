# 주간 체크인 발송 (T10 재방문 트리거 — 운영 플레이북)

> 목적: 예측이 있는 진단의 검증 데이터(`diagnosis_outcomes`)를 모으는 게 적중률 측정·개인화·WTP의 연료.
> F&F 베타에선 자동 발송(이메일/알림톡) 대신 **창업자가 주 1~2회 직접 카톡 발송**이 가장 확실하고 빠름.
> 앱 내에는 `CheckinNudge`(진단 첫 화면 카드)가 이미 재방문자를 자동으로 체크인에 연결함 — 이 문서는 "먼저 다가가는" 쪽.

## 1. 발송 대상 뽑기 (Supabase → SQL Editor, 주 1~2회)

```sql
-- 체크인 발송 대상: 예측 있음 + 5~21일 경과 + 아직 '맞았나요?' 미응답
select
  u.email,
  d.stage,
  d.created_at::date                        as 진단일,
  (current_date - d.created_at::date)       as 경과일,
  left(d.result->>'prediction', 60)         as 예측,
  'https://qpit.vercel.app/history/' || d.id as 체크인_링크
from public.diagnoses d
join auth.users u on u.id = d.user_id
where coalesce(d.result->>'prediction', '') <> ''
  and d.created_at between now() - interval '21 days' and now() - interval '5 days'
  and not exists (
    select 1 from public.diagnosis_outcomes o
    where o.diagnosis_id = d.id and o.kind = 'prediction'
  )
order by d.created_at;
```

## 2. 카톡 발송 문구 (개인화해서 보내기)

> OO야! 저번에 큐핏이 "{예측 앞부분}…"이라고 예측했잖아 👀
> 맞았는지 궁금해서! 30초면 돼 → {체크인_링크}
> (맞았는지 알려주면 다음 진단이 더 정확해져)

- 링크는 로그인한 기기에서 열어야 본인 결과가 보임(RLS).
- 한 사람에게 같은 진단으로 **1회만** — 반-집착 톤의 앱이 집착하면 모순.

## 3. 회수 현황 확인

```sql
-- 회수율: 예측 있는 진단 대비 체크인 응답 비율
select
  count(*) filter (where coalesce(d.result->>'prediction','') <> '')                       as 예측있는진단,
  count(*) filter (where o.id is not null)                                                  as 응답됨,
  round(100.0 * count(*) filter (where o.id is not null)
        / nullif(count(*) filter (where coalesce(d.result->>'prediction','') <> ''), 0), 1) as 회수율_pct
from public.diagnoses d
left join public.diagnosis_outcomes o on o.diagnosis_id = d.id and o.kind = 'prediction';
```

## 4. 다음 단계 (자동화 — 규모 커지면)
- Resend(이메일) 또는 카카오 알림톡 + Vercel Cron으로 자동 발송. 둘 다 **창업자가 계정·키 세팅** 필요.
- 그 시점에 `diagnoses.due_at` 컬럼 추가(예측 유형별 검증 시점 D+7/D+14 구분)를 함께.
