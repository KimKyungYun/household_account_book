import { withHandler } from '@/lib/api/withHandler';
import { backfillLoan, createLoan, listLoans } from '@/lib/repository/loan';
import { createLoanSchema } from '@/service/loan/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({}, (ctx) => listLoans(ctx.householdId));

export const POST = withHandler({ body: createLoanSchema }, async (ctx, { body }) => {
  const loan = await createLoan(ctx.householdId, body);
  // 첫 상환일이 이미 지났다면 지금 바로 거래로 옮긴다. 가구 단위 하루 1회 스로틀에
  // 걸려 오늘 등록한 대출이 이번 달 집계에서 빠지는 것을 막는다.
  await backfillLoan({ householdId: ctx.householdId, userId: ctx.userId }, loan.id);

  return loan;
});
