-- rr_shape 가 MONTHLY 인데 dayOfMonth 가 NULL 인 행을 통과시키고 있었다.
--
-- CHECK 제약은 식이 FALSE 일 때만 거부하고 **NULL 이면 통과**시킨다.
-- `NULL BETWEEN 1 AND 31` 은 NULL 이므로 MONTHLY 분기가 NULL 이 되고,
-- (NULL OR FALSE OR FALSE) = NULL → 통과. 3값 논리의 고전적 함정이다.
-- 각 분기에 IS NOT NULL 을 명시해 FALSE 가 되도록 고친다.

ALTER TABLE "RecurringRule" DROP CONSTRAINT IF EXISTS "rr_shape";

ALTER TABLE "RecurringRule" ADD CONSTRAINT "rr_shape" CHECK (
  (freq = 'MONTHLY' AND "dayOfMonth" IS NOT NULL AND "dayOfMonth" BETWEEN 1 AND 31) OR
  (freq = 'WEEKLY'  AND weekday     IS NOT NULL AND weekday     BETWEEN 0 AND 6)  OR
  (freq = 'YEARLY'  AND "dayOfMonth" IS NOT NULL AND "dayOfMonth" BETWEEN 1 AND 31
                    AND "monthOfYear" IS NOT NULL AND "monthOfYear" BETWEEN 1 AND 12)
);
