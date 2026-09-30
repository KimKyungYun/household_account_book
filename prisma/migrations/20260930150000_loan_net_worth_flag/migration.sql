-- 순자산에 이 대출을 셀지 고르는 스위치.
--
-- 전세자금대출처럼 짝이 되는 자산(전세보증금)을 앱에 넣지 않은 경우, 대출만 빼면
-- 순자산이 실제보다 낮게 나온다. 기존 대출은 지금까지 보이던 대로 모두 포함이므로
-- 기본값을 true 로 둔다.
ALTER TABLE "Loan" ADD COLUMN "includeInNetWorth" BOOLEAN NOT NULL DEFAULT true;
