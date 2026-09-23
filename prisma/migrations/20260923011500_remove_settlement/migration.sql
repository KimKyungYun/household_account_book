-- 정산(나눠 내기) 기능 제거
--
-- 각자 쓴 돈을 기록하기만 하고 서로 주고받는 계산은 하지 않기로 했다.
-- '같이 쓴 돈 / 각자 쓴 돈' 구분(Transaction.splitMode)은 분류로 계속 쓰므로 남긴다.
-- 지우는 것은 분담률과 정산 결과뿐이다.

-- 1) 정산 결과 스냅샷과 거래별 분담률 표
DROP TABLE IF EXISTS "MonthlySettlement";
DROP TABLE IF EXISTS "TransactionSplit";

-- 2) 구성원 기본 분담률
ALTER TABLE "HouseholdMember" DROP CONSTRAINT IF EXISTS "member_share_bp_range";
ALTER TABLE "HouseholdMember" DROP COLUMN IF EXISTS "defaultShareBp";

-- 3) SplitMode 에서 CUSTOM 제거
--
-- CUSTOM 은 '이 거래만 분담률을 따로 준다'는 뜻이라 TransactionSplit 이 없으면
-- 저장할 곳이 사라진다. Postgres 는 enum 값을 지울 수 없어 타입을 새로 만들고
-- 쓰는 컬럼을 모두 옮긴다.
--
-- 순서가 중요하다. 기본값과 **그 타입을 참조하는 CHECK 제약**을 먼저 떼지 않으면
-- 타입 변경이 "operator does not exist" 로 거부된다 — 제약이 옛 타입의 값과
-- 비교하고 있기 때문이다.
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "tx_transfer_no_split";
ALTER TABLE "Transaction"   ALTER COLUMN "splitMode" DROP DEFAULT;
ALTER TABLE "RecurringRule" ALTER COLUMN "splitMode" DROP DEFAULT;

ALTER TYPE "SplitMode" RENAME TO "SplitMode_old";
CREATE TYPE "SplitMode" AS ENUM ('SHARED', 'PERSONAL');

ALTER TABLE "Category"      ALTER COLUMN "defaultSplitMode" TYPE "SplitMode" USING ("defaultSplitMode"::text::"SplitMode");
ALTER TABLE "Transaction"   ALTER COLUMN "splitMode"        TYPE "SplitMode" USING ("splitMode"::text::"SplitMode");
ALTER TABLE "RecurringRule" ALTER COLUMN "splitMode"        TYPE "SplitMode" USING ("splitMode"::text::"SplitMode");

ALTER TABLE "Transaction"   ALTER COLUMN "splitMode" SET DEFAULT 'SHARED';
ALTER TABLE "RecurringRule" ALTER COLUMN "splitMode" SET DEFAULT 'SHARED';

DROP TYPE "SplitMode_old";

-- 이체는 같이 쓴 돈인지 따질 대상이 아니다. 새 타입으로 다시 건다.
ALTER TABLE "Transaction" ADD CONSTRAINT "tx_transfer_no_split"
  CHECK (type <> 'TRANSFER' OR "splitMode" = 'PERSONAL');
