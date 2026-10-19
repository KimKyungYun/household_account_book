-- 만기일시: 원금과 이자를 만기에 한 번에 갚는다. 값만 더하므로 기존 대출은 그대로다.
ALTER TYPE "RepaymentType" ADD VALUE 'BULLET';
