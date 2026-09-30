# 백엔드 · DB 구조

이 문서는 서버와 데이터베이스가 어떻게 생겼고 **왜 그렇게 만들었는지**를 적는다.
스키마를 고칠 때 같이 고친다. 화면(프론트) 구조는 다루지 않는다.

- 확인 기준: 마이그레이션 `20260922112916_fix_recurring_rule_shape` 시점
- 앱 테이블 13개(+ Prisma 관리 테이블 1개) / enum 7개 / API 엔드포인트 25개

---

## 1. 무엇으로 만들었나

| | |
| --- | --- |
| 런타임 | Next.js 16 App Router **풀스택** (Route Handlers 가 API) |
| DB | PostgreSQL 17 (로컬 Docker → 배포 시 Neon) |
| ORM | Prisma 7 — **드라이버 어댑터 필수** (`@prisma/adapter-pg` + `pg`) |
| 인증 | Auth.js v5 (next-auth) · Credentials(이메일+비밀번호) · JWT 세션 |
| 검증 | zod — **클라이언트 폼과 서버가 같은 스키마를 공유** |
| 엑셀 | exceljs (서버에서 생성해 blob 으로 내려준다) |

서버를 따로 띄우지 않은 이유는 2인용 앱에 그럴 이유가 없어서다. 대신 아래 3번의
계층 경계를 지켜, 나중에 별도 서버로 떼어낼 때 `src/lib/**` 만 옮기면 되게 해 두었다.

Prisma 7 은 v6 와 다르다. 세 가지가 특히 다르다.

- 생성된 클라이언트가 `node_modules` 가 아니라 **`src/generated/prisma`** 로 나온다 (gitignore 대상)
- DB 접속 문자열이 `schema.prisma` 가 아니라 **`prisma.config.ts`** 에 있다
- 엔진 바이너리가 없고 **어댑터를 주입**한다 — `src/lib/prisma.ts` 참고

---

## 2. 폴더

```
prisma/
  schema.prisma          모델 정의
  migrations/            SQL. CHECK 제약과 부분 유니크 인덱스가 여기 들어 있다
  seed.ts                로컬 개발용 시드 (기본 분류·결제수단·계정)
src/
  app/api/**/route.ts    HTTP 진입점. 얇다 — 검증 스키마를 고르고 repository 를 부른다
  lib/
    auth.ts              Auth.js 설정
    prisma.ts            PrismaClient 싱글턴
    api/
      withHandler.ts     모든 요청이 지나가는 문 (아래 4번)
      httpError.ts       에러 → HTTP 매핑
    repository/          Prisma 쿼리. 도메인당 한 파일
    domain/              DB 를 모르는 순수 계산 (정산·반복 발생일) + 단위 테스트
    excel/               워크북 생성
    seed/defaults.ts     기본 분류 상수 — 시드와 온보딩 API 가 공유
  service/               브라우저가 HTTP 로 부르는 계층 (도메인별 index/type/schema)
  interface/errorType.ts 프론트의 ApiError
```

`lib/` 는 **서버 전용**이다. ESLint 가 `src/components/**` · `src/app/**/components/**` ·
`src/hooks/**` · `src/stores/**` 에서 `@/lib/**` import 를 막는다. 서버 비밀이 브라우저
번들로 새는 것을 코드로 차단한다. 화면은 `@/service` 를 통해서만 서버에 닿는다.

---

## 3. 요청이 지나가는 길

```
브라우저
  └ service/<도메인>/index.ts        fetch 래퍼 (httpClient)
      └ app/api/<경로>/route.ts      withHandler 로 감싼 핸들러
          └ lib/repository/<도메인>  Prisma 쿼리
              └ lib/domain/*         순수 계산 (필요할 때만)
                  └ PostgreSQL
```

**Server Component 에서 Prisma 를 직접 부르지 않는다.** 같은 데이터에 두 경로가 생기면
권한 검사와 집계 로직이 흩어지고 한쪽만 고치는 버그가 난다. 유일한 예외는
`(main)/layout.tsx` 의 반복 거래 백필인데, 그것도 `lib/repository/recurring.ts` 의
같은 함수를 부른다.

axios 를 쓰지 않는다. 인터셉터가 해 주던 일(토큰 주입·refresh 재시도)이 Auth.js 쿠키
세션으로 사라졌기 때문이다. 대신 `service/httpClient.ts` 가 두 가지를 반드시 지킨다.

1. **비-2xx 를 직접 throw** — fetch 는 404·500 에도 resolve 한다. 안 던지면 react-query 가 성공으로 오인한다
2. **빈 값·빈 배열을 쿼리에서 제거** — 안 하면 `categoryId=` 가 날아가 zod 가 400 을 낸다

---

## 4. `withHandler` — 모든 요청이 지나가는 문

`src/lib/api/withHandler.ts`. 순서대로 네 가지를 한다.

1. `auth()` 로 세션 확인 → 없으면 401
2. **테넌트 키를 세션에서만 주입**
3. zod 파싱 (`body` / `query` / `params`) → 실패 시 400 + `fieldErrors`
4. 예외 → HTTP 매핑. 예상 못 한 것은 서버 로그에만 남기고 밖에는 `500 / '오류가 발생했습니다.'`

2번이 이 앱의 최대 보안 지점이다. `householdId` 를 **요청 본문이나 쿼리에서 절대 받지
않는다.** 받으면 남의 가구 데이터가 그대로 뚫린다. 핸들러는 `ctx.householdId` 만 쓸 수
있고, repository 함수도 첫 인자로 그것을 받는 시그니처다.

```ts
// 반드시 이렇게
where: { id, householdId }
// 이렇게 쓰면 남의 데이터가 수정된다
where: { id }
```

세 가지 변형이 있다.

| 함수 | 쓰는 곳 |
| --- | --- |
| `withHandler` | 기본. 로그인 + 가구 소속이 모두 필요 |
| `withPreOnboardingHandler` | 로그인은 했지만 아직 가구가 없는 상태 (`/me`, `/household` POST, `/household/join`) |
| `withPublicHandler` | 로그인 전 (`/auth/signup`) |

### 에러 형식

성공은 payload 를 그대로 주고, 실패는 항상 같은 모양이다.

```json
{ "code": "VALIDATION", "message": "입력값을 확인해 주세요.", "fieldErrors": { "amount": "..." } }
```

`fieldErrors` 를 react-hook-form 의 `setError` 에 그대로 꽂는다. 그래서 프론트와 서버의
문구가 갈리지 않는다.

| code | status |
| --- | --- |
| `VALIDATION` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` / `STALE_WRITE` | 409 |
| `INTERNAL` | 500 |

---

## 5. 인증

Credentials(이메일+비밀번호) 하나만 쓴다. 두 사람만 쓰는 앱에 소셜 로그인 설정을
얹을 이유가 없고, 매직링크는 SMTP 가 필요하다. 비밀번호는 bcrypt(rounds 12).

`AUTH_ALLOWED_EMAILS` 에 적힌 이메일만 가입·로그인할 수 있다. 가입 봇을 막는
가장 저렴한 수단이다.

Credentials 는 DB 세션을 쓸 수 없어 전략이 JWT 다. **다만 가구·구성원 정보는 토큰에
캐시하지 않고 `session` 콜백에서 매번 조회한다.** 캐시하면 온보딩 직후(가구가 막 생긴
시점) 토큰이 낡아 "가구 설정을 먼저 마쳐 주세요"에 갇힌다. 풀려면 세션 갱신 트리거가
필요하고 그건 `SessionProvider` 를 부른다. 2인 앱에서 요청당 조회 1회는 무의미한
비용이라 낡음 버그가 생길 여지를 지우는 쪽을 택했다.

화면은 `useSession()` 대신 **`GET /api/me`** 를 react-query 로 읽는다. 화면이 실제로
필요한 것은 세션 토큰이 아니라 표시 이름·구성원 색·분담률 같은 DB 프로필이라
어차피 이 엔드포인트가 필요하다. Provider 를 둘 둘 이유가 없다.

인증의 정본은 `(main)/layout.tsx` 의 `auth()` + `redirect()` 다. 서버에서 막으면
미인증 사용자에게 보호 화면의 JS 청크와 데이터가 **아예 전송되지 않는다.**
`middleware.ts` 는 쿠키가 없을 때 조기 리다이렉트하는 UX 최적화용이다.

---

## 6. 데이터 모델

### 관계도

```
User ──1:1── HouseholdMember ──N:1── Household
 │                 │                    │
 │                 │                    ├── Category (self-relation, 2단)
 │                 │                    ├── PaymentMethod
 │                 │                    ├── Budget
 │                 │                    ├── RecurringRule ──1:N── RecurringOccurrence
 │                 │                    └── MonthlySettlement
 │                 │
 └─ createdBy ── Transaction ──N:1── Category / PaymentMethod / RecurringRule
                      └──1:N── TransactionSplit ──N:1── HouseholdMember
```

Auth.js 표준 테이블(`Account` `Session` `VerificationToken`)은 어댑터용이라 위 그림에서 뺐다.

### 테이블

| 테이블 | 역할 | 알아 둘 점 |
| --- | --- | --- |
| `Household` | 가구 | `inviteCode` 로 배우자를 초대한다. `lastRecurringRunOn` 은 백필 스로틀용 |
| `HouseholdMember` | 구성원 | `slot`(0·1)으로 순서를 고정한다 — 차트 색과 정산 방향이 흔들리지 않게. `defaultShareBp` 가 분담률 |
| `Category` | 분류 | **한 테이블 self-relation**으로 2단. `level`(1·2) + `parentId` 정합은 DB CHECK 로 고정 |
| `PaymentMethod` | 결제수단 | 개인 카드면 `ownerMemberId` |
| `Transaction` | 거래 | 이 앱의 중심. 아래 7번의 규칙이 전부 여기 걸린다 |
| `TransactionSplit` | 거래별 분담률 | `splitMode = CUSTOM` 일 때만 행이 생긴다. 평상시 0행이라 비용이 없다 |
| `Budget` | 월 예산 | `(householdId, categoryId, yearMonth)` 유니크 |
| `RecurringRule` | 반복 규칙 | 주기를 **구조화 필드**로 저장 (cron 문자열 아님) |
| `RecurringOccurrence` | 회차 원장 | `(ruleId, occurrenceDate)` 유니크. **이게 없으면 지운 거래가 되살아난다** |
| `Asset` | 모으는 자산 | '청년미래적금', '주식' 처럼 사람이 이름 붙인 통. **잔액을 저장하지 않고** `openingBalance` + 연결된 거래의 합으로 계산한다 |

### enum

| enum | 값 |
| --- | --- |
| `CategoryKind` | `EXPENSE` `INCOME` `TRANSFER` |
| `SplitMode` | `SHARED` `PERSONAL` `CUSTOM` |
| `TransactionType` | `INCOME` `EXPENSE` `TRANSFER` |
| `TransactionSource` | `MANUAL` `RECURRING` `IMPORT` |
| `PaymentMethodKind` | `CASH` `DEBIT_CARD` `CREDIT_CARD` `BANK_TRANSFER` `EASY_PAY` `GIFT_CARD` `OTHER` |
| `RecurrenceFreq` | `WEEKLY` `MONTHLY` `YEARLY` |

---

## 7. 반드시 지켜야 하는 규칙

고치기 전에 이 절을 읽는다. 하나하나 실제 버그를 막고 있다.

### 금액은 `Int`, 원 단위

KRW 에 소수 단위가 없다. `Decimal` 은 `Decimal.js` 객체로 반환되어 JSON 직렬화·zod·
차트마다 변환이 붙는다. Int 상한 21.4억원이 단일 거래보다 크고, `SUM(int4)` 은
Postgres 가 bigint 로 승격하므로 합계 오버플로도 없다.

음수는 **환불·정정**이다. `SUM` 이 자동으로 상계하므로 집계에 분기가 필요 없다.
다만 `minAmount`/`maxAmount` 필터와 "최고 지출 TOP N" 은 `ABS()` 를 써야 한다.

### 분담률은 basis point `Int` (0–10000)

실수 비율을 저장하지 않는다. 구성원 합이 정확히 10000 이어야 하고, 서버가 저장 전에
검증한다(`PATCH /api/household`). 합이 어긋나면 정산 총액이 맞지 않는다.

### 날짜는 `@db.Date`, 앱 경계는 `'YYYY-MM-DD'` 문자열

`DateTime` 기본값은 `timestamptz` 가 되어 `2026-01-01 00:00 KST` → `2025-12-31 15:00Z`
로 저장되고, 월 집계에서 1일 거래가 전월로 새는 고전적 버그가 난다.

- "오늘"은 항상 `Asia/Seoul` 로 계산한다 (`todayInSeoul()`). **`new Date().getMonth()` 금지** — Vercel 은 UTC 라 9시간 밀린다
- 기간 필터는 항상 `date >= from AND date < to+1일` **반개구간**. `BETWEEN` 은 종료일 포함 여부 실수를 유발한다

### 이체(`TRANSFER`)는 모든 집계에서 빠진다

계좌간 이동·카드대금 납부·현금 인출·예적금이 여기 들어간다. 이걸 지출로 잡으면
같은 돈을 두 번 세게 되고 `순저축 = 수입 − 지출` 이 무너진다.

- 거래 목록의 기본 `type` 필터가 `['INCOME', 'EXPENSE']` — 이체는 명시적으로 골라야 보인다
- 정산·예산·통계 쿼리에서 모두 제외한다
- DB CHECK 가 이체의 `splitMode` 를 `PERSONAL` 로 못 박는다 (정산 대상이 될 수 없다)

### 자산은 잔액을 저장하지 않는다

`Asset.openingBalance` 에서 시작해 그 자산에 연결된 거래를 더해 잔액을 낸다.
저장해 두면 거래를 고칠 때마다 맞춰야 하고, 한 번 어긋나면 어느 쪽이 맞는지 알 수 없다.

- 자산은 **`TRANSFER` 에만** 붙는다 (`tx_asset_transfer_only` CHECK). 수입·지출에 붙이면
  그 돈이 합계에도 들어가고 자산에도 쌓여 같은 금액을 두 번 세게 된다.
- 반복 규칙에도 자산을 붙일 수 있다. 매달 만들어지는 거래가 그 자산으로 쌓인다 —
  적금이 자동으로 늘어나는 것이 이 고리다.
- 자산을 지워도 **거래는 남는다.** 실제로 통장에서 나간 기록이라 함께 지우면 지난 달
  합계가 통째로 바뀐다. `assetId` 만 `SetNull` 로 끊긴다.

### 삭제 정책

| 대상 | 방식 | 이유 |
| --- | --- | --- |
| `Transaction` | hard delete | 모든 집계 쿼리에 `deletedAt IS NULL` 을 끼우는 비용 > 2인 가구의 복구 가치 |
| `Category` `PaymentMethod` | `isActive` 아카이브 | 거래가 FK 로 물려 있어 지울 수 없다 |
| `RecurringRule` | hard delete 가능 | **단, 만들어진 거래는 남긴다.** 실제로 나간 돈의 기록이라 함께 지우면 지난 달 합계와 정산이 통째로 바뀐다. FK 가 `SetNull` |

거래가 달린 분류는 삭제되지 않는다. `409 CONFLICT` 로 건수를 알려 주고 화면이
`POST /api/categories/[id]/merge`(다른 분류로 옮기고 정리)로 유도한다.

### 동시성

| 문제 | 수단 |
| --- | --- |
| 부부가 같은 거래를 동시에 수정 | `Transaction.version` 낙관적 락 → `409 STALE_WRITE`. `updateMany` 의 영향 행이 0이면 그 사이 상대가 저장했다는 뜻 |
| 더블 서브밋 | `clientRequestId` + `(householdId, clientRequestId)` 유니크. 같은 키로 두 번 오면 앞서 만든 것을 그대로 돌려준다 |
| 동시 접속 시 반복 거래 중복 생성 | `RecurringOccurrence` 를 **먼저** 넣고(`skipDuplicates`) 성공했을 때만 거래를 만든다 |

---

## 8. Prisma 로 표현할 수 없어 SQL 로 넣은 것

`prisma/migrations/**/migration.sql` 에 들어 있다. **스키마를 고쳐도 이것들은 자동으로
따라오지 않으니** 관련 필드를 바꿀 때 같이 본다.

### CHECK 제약 17개

| 테이블 | 제약 | 막는 것 |
| --- | --- | --- |
| `Category` | `category_level_shape` | 3단 중첩, 루트에 부모가 있는 상태 |
| `Transaction` | `tx_amount_nonzero` | 0원 거래 |
| | `tx_category_required` | 수입·지출에 분류가 없는 상태 |
| | `tx_transfer_positive` | 음수 이체 |
| | `tx_transfer_no_split` | 이체가 분담 대상이 되는 것 |
| | `tx_installment_positive` | 할부 1개월 |
| `HouseholdMember` | `member_share_bp_range` `member_slot_range` | 분담률·자리 범위 |
| `TransactionSplit` | `split_share_bp_range` | 분담률 범위 |
| `Budget` | `budget_amount_nonneg` `budget_ym_format` | 음수 예산, 잘못된 연월 |
| `RecurringRule` | `rr_shape` `rr_interval_positive` `rr_period_order` | 주기별 필수 필드 누락, 종료일이 시작일보다 이른 것 |
| `Household` | `household_fiscal_start_day_range` | 회계 시작일 범위 |
| `MonthlySettlement` | `settlement_ym_format` `settlement_transfer_nonneg` | 잘못된 연월, 음수 이동액 |

> **CHECK 의 함정.** CHECK 는 식이 `FALSE` 일 때만 거부하고 **`NULL` 이면 통과**시킨다.
> `rr_shape` 가 처음에 `NULL BETWEEN 1 AND 31` 이어서 MONTHLY 인데 날짜가 빈 행을
> 그대로 받아들였다. 각 분기에 `IS NOT NULL` 을 함께 써야 한다.
> (`20260922112916_fix_recurring_rule_shape` 가 이걸 고친 마이그레이션이다)

### 부분 유니크 인덱스 2개

```sql
CREATE UNIQUE INDEX category_root_name_uniq
  ON "Category"("householdId", name) WHERE "parentId" IS NULL;
CREATE UNIQUE INDEX category_child_name_uniq
  ON "Category"("householdId", "parentId", name) WHERE "parentId" IS NOT NULL;
```

Postgres 는 `NULL` 을 서로 다른 값으로 본다. 그래서 `@@unique([householdId, parentId, name])`
만으로는 **큰 분류의 이름 중복이 막히지 않는다.** 두 인덱스로 나눠 걸어야 한다.

### 복합 FK 트릭

`Category` 에 상수 생성열 `parent_level = 1` 을 두고 `(parentId, parent_level) → (id, level)`
복합 FK 를 걸었다. 소분류의 부모가 반드시 대분류여야 한다는 규칙을 DB 가 지킨다.
`parentId` 가 NULL 이면 MATCH SIMPLE 규칙으로 검사되지 않아 대분류는 자유롭다.

### 검색 인덱스

`pg_trgm` GIN 인덱스가 `Transaction.merchant` 와 `memo` 에 걸려 있다. 수만 행에서는
`ILIKE '%…%'` 만으로도 충분하지만 미리 깔아 두었다.

---

## 9. 집계 전략

**전부 그때그때 계산한다. 월 마감 스냅샷 테이블을 두지 않는다.**

2인 × 연 3천건이면 10년에 3만 행이다. 인덱스까지 수 MB 이고 `GROUP BY` 가 한 자릿수
ms 다. 스냅샷은 정합성 관리 비용만 늘린다.

인덱스는 집계 쿼리와 1:1 로 대응한다.

```
@@index([householdId, date, id])           목록 기본 정렬
@@index([householdId, type, date])         월별 수입·지출
@@index([householdId, categoryId, date])   분류별 집계 / 예산 사용률
@@index([householdId, memberId, date])     사람별
@@index([householdId, splitMode, date])    정산 (같이 쓴 돈만)
```

도입 기준을 미리 정해 둔다: **단일 월 집계 p95 > 300ms 또는 거래 50만 행 초과.**
둘 다 이 앱에서 도달하지 않는다.

`MonthlySettlement` 만 예외다. 그건 성능이 아니라 "부부가 합의한 결과를 동결"하는
업무 요구라서 있다. 확정 후 그 달 거래가 바뀌면 재계산값과 비교해 재확정을 유도한다.

---

## 10. 순수 도메인 계산

DB 를 모르는 함수로 떼어 두고 단위 테스트를 붙였다. 이 앱에서 버그 밀도가 가장
높은 두 곳이다. (`yarn test` — 26개)

### `lib/domain/settlement.ts` — 정산

```
owed_M = Σ trunc(거래금액 × shareBp_M / 10000)
balance = paid − owed
```

- 대상은 `type = EXPENSE AND splitMode ≠ PERSONAL` 뿐
- **반올림 잔여(1~2원)는 그 거래의 결제자에게 귀속**시킨다. 이 규칙이 없으면 각자 몫의 합이 총액과 어긋나고 숫자를 믿을 수 없게 된다
- `floor` 가 아니라 `trunc` 를 쓴다 — 환불(음수)에서 floor 는 한쪽으로 치우친다

### `lib/domain/recurring.ts` — 반복 발생일

- `dayOfMonth = 31` 은 그 달 일수로 **클램프**한다 → 2월은 28/29일. '말일'을 따로 두지 않는다
- `interval > 1` 은 **`startDate` 의 월을 기준점**으로 세어 드리프트를 막는다. '이전 발생일 + interval' 로 더하면 클램프된 달을 지날 때 기준이 밀린다
- 모든 계산은 UTC 자정 기준 `'YYYY-MM-DD'` 문자열로만 한다

---

## 11. 반복 거래 자동 생성

별도 스케줄러가 없다. **앱에 들어올 때 지난 회차를 채운다.**

Vercel Cron 을 쓰지 않은 이유는 Hobby 플랜이 하루 1회 제한이고, 무엇보다 **로컬
Docker 개발에서는 아예 돌지 않아 테스트 경로가 갈라지기** 때문이다.

```
(main)/layout.tsx
  └ ensureRecurringUpToDate()      Household.lastRecurringRunOn 으로 하루 1회 스로틀
      └ backfillRecurring()        회차마다 아래를 한 트랜잭션으로
            1) RecurringOccurrence 삽입 (skipDuplicates)
            2) count === 0 이면 이미 처리한 회차 → 건너뜀
            3) Transaction 생성
            4) Occurrence.transactionId 연결
```

- 중복 생성은 `(ruleId, occurrenceDate)` 유니크가 **DB 수준에서** 막는다
- 아직 날짜가 오지 않은 회차도 만든다. 화면은 상태값이 아니라 **날짜로** '예정'을 가른다
- 사용자가 생성분을 지우면 `Occurrence.skipped = true` 로 남겨 **다음 백필에서 되살아나지 않게** 한다
- 한 회차가 실패해도 나머지는 계속 만든다. 다음 진입에서 재시도된다
- 설정 화면의 수동 버튼(`POST /api/recurring-rules/run`)이 같은 함수를 쓴다

미래 날짜는 만들지 않는다(당일까지만). `endDate` 초과분은 중단한다.

---

## 12. 엑셀 생성

`GET /api/export/excel?from=&to=&sheets=` — **서버가 통째로 만들고 프론트는 blob 을
받아 저장**한다. `runtime = 'nodejs'` 필수이고 `serverExternalPackages: ['exceljs']` 로
번들링을 피한다 (exceljs 가 `node:stream`·`zlib` 에 의존한다).

| 시트 | 내용 |
| --- | --- |
| 요약 | 기간 총계, 월별 표, 사람별 |
| 상세 | 전체 거래. `autoFilter` + 머리글 고정 + 합계행이 `SUBTOTAL(9,…)` 이라 필터에 연동된다 |
| 분류별 표 | 행=분류, 열=월, 값=지출 + 합계·구성비 |
| 나누기 내역 | 선택. 월별 분담률·분담액·납부액·차액 |

지켜야 할 것.

- **숫자는 셀 값이 숫자여야 한다.** 문자열로 넣으면 받는 쪽에서 합계를 낼 수 없다
- 비율은 0~1 로 저장하고 서식으로 `0.0%` 를 준다. 87.3 을 넣으면 8730% 가 된다
- **한글 파일명은 반드시** `filename="ascii.xlsx"; filename*=UTF-8''<encodeURIComponent>` — 헤더에 raw 한글을 넣으면 undici 가 `ERR_INVALID_CHAR` 로 던진다 (실제로 확인함)
- 기간 상한 5년 (zod 검증)

---

## 13. API 목록

| 메서드 | 경로 | 하는 일 |
| --- | --- | --- |
| — | `/api/auth/[...nextauth]` | Auth.js 핸들러 |
| POST | `/api/auth/signup` | 가입 (공개) |
| GET | `/api/me` | 가구 프로필 |
| POST PATCH | `/api/household` | 가구 생성(온보딩) / 이름·구성원·분담률 수정 |
| POST | `/api/household/join` | 초대 코드로 합류 |
| POST | `/api/household/invite/rotate` | 초대 코드 재발급 |
| GET POST | `/api/categories` | 2단 트리 조회 / 생성 |
| PATCH DELETE | `/api/categories/[id]` | 수정·보관 / 삭제 |
| POST | `/api/categories/[id]/merge` | 거래를 다른 분류로 옮기고 정리 |
| GET | `/api/payment-methods` | 결제수단 목록 |
| GET POST | `/api/transactions` | 목록(필터·페이지·합계) / 생성 |
| GET PATCH DELETE | `/api/transactions/[id]` | 단건 / 수정(낙관적 락) / 삭제 |
| GET POST | `/api/assets` | 자산 목록 + 잔액 / 생성 |
| PATCH DELETE | `/api/assets/[id]` | 수정 / 삭제(거래는 남김) |
| GET | `/api/assets/trend` | 월별 누적 잔액 추이 |
| GET PUT | `/api/budgets` | 예산 대비 실적 / 배치 upsert |
| POST | `/api/budgets/copy` | 전월 예산 복사 |
| GET POST | `/api/recurring-rules` | 목록(다음 발생일 포함) / 생성 |
| PATCH PUT DELETE | `/api/recurring-rules/[id]` | 수정 / 중지·재개 / 삭제 |
| POST | `/api/recurring-rules/run` | 밀린 회차 수동 생성 |
| GET | `/api/settlement` | 월 정산 계산 |
| GET | `/api/stats/overview` | 월 요약 + 전월 대비 |
| GET | `/api/stats/monthly` | 기간 추이 |
| GET | `/api/stats/categories` | 분류별 비중 + 전월 대비 |
| GET | `/api/stats/members` | 사람별 |
| GET | `/api/export/excel` | 엑셀 blob |

### `GET /api/transactions` 파라미터

`from`·`to` (또는 `yearMonth`), `memberId`, `categoryId`(큰 분류 지정 시 하위 포함),
`type`(기본값에서 이체 제외), `paymentMethodId`, `splitMode`, `status`,
`minAmount`·`maxAmount`(`ABS` 기준), `q`(사용처·메모), `sort`, `page`·`pageSize`.

응답에 `summary` 를 함께 담는다. **현재 페이지가 아니라 필터 전체 기준**이라
목록 상단 합계를 한 번에 그릴 수 있다.

정렬의 2차 키는 항상 `id` 다. 같은 날 거래의 순서가 페이지마다 흔들리지 않게 한다.
오프셋 페이지네이션을 쓴다 — 총건수·페이지번호·필터 합계를 자연스럽게 줄 수 있고
수만 행에서 `OFFSET` 비용은 무시할 수 있다.

---

## 14. 로컬에서 돌리기

```bash
yarn db:up          # docker compose up -d (postgres:17-alpine)
yarn db:migrate     # prisma migrate dev
yarn db:seed        # 기본 분류·결제수단·개발용 계정
yarn dev
```

`.env` 는 `.env.example` 을 복사해 만든다. `AUTH_SECRET` 은 `openssl rand -base64 32`.

| 명령 | |
| --- | --- |
| `yarn db:studio` | Prisma Studio |
| `yarn db:deploy` | `migrate deploy` (비대화형, 배포용) |
| `yarn test` | 도메인 단위 테스트 26개 |

### 스키마를 고칠 때

1. `prisma/schema.prisma` 수정
2. `yarn prisma migrate dev --name <이름> --create-only`
3. 생성된 `migration.sql` 에 **CHECK 제약·부분 유니크 인덱스를 손으로 추가**
4. `yarn db:migrate` 로 적용
5. psql 에서 **의도적으로 위반하는 INSERT** 를 날려 제약이 거부하는지 확인

5번을 빼먹으면 안 된다. `rr_shape` 의 NULL 통과 버그가 이 단계에서 잡혔다.

`migrate dev` 는 대화형 프롬프트에서 멈출 수 있다. 스크립트에서는 `migrate deploy` 를
쓴다. `migrate reset` 은 Prisma 7 에서 사용자 동의를 요구한다.

---

## 15. 아직 없는 것

| | 상태 |
| --- | --- |
| 영수증 사진 | 스토리지가 필요해 보류 |
| CSV 임포트 | `TransactionSource.IMPORT` 만 예약 |
| 빚(대출) | 자산은 되지만 상환은 잔액이 줄어드는 방향이라 '옮긴 돈'(양수만)으로 표현할 수 없다 |
| 결제수단 잔액 | `PaymentMethod` 자체에는 잔액이 없다. 모으는 돈만 `Asset` 이 다룬다 |
| 이체 짝 거래 | `transferPeerId` 필드와 삭제 방어만 있고 짝 생성 API 미구현 |
| 회계월 | `Household.fiscalStartDay` 필드만 있고 v1 은 달력월 고정 |
