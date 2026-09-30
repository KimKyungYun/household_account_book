-- '금액 확인' 제거
--
-- 반복 거래에 '금액이 매달 바뀜'을 표시해 두면 만들어지는 거래가 PENDING 이 되고
-- 대시보드에 '금액 확인 N건'이 떴다. 그런데 확인했다고 표시할 방법이 화면에 없어
-- 한번 붙은 표시가 영영 사라지지 않았다. 쓸모를 못 하는 상태값이라 걷어낸다.
--
-- 아직 날짜가 오지 않은 거래를 '예정'으로 보여 주는 것은 그대로다. 그건 상태가 아니라
-- 날짜로 알 수 있다 — 화면이 이미 date > 오늘 로 판단하고 있었다.

ALTER TABLE "Transaction"   DROP COLUMN IF EXISTS "status";
ALTER TABLE "RecurringRule" DROP COLUMN IF EXISTS "amountIsFixed";

DROP TYPE IF EXISTS "TransactionStatus";
