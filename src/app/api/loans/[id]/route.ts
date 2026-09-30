import { withHandler } from '@/lib/api/withHandler';
import { backfillLoan, deleteLoan, updateLoan } from '@/lib/repository/loan';
import { loanIdParamsSchema, updateLoanSchema } from '@/service/loan/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withHandler(
  { body: updateLoanSchema, params: loanIdParamsSchema },
  async (ctx, { body, params }) => {
    const loan = await updateLoan(ctx.householdId, params.id, body);
    await backfillLoan({ householdId: ctx.householdId, userId: ctx.userId }, loan.id);

    return loan;
  },
);

/** 대출만 지운다. 이미 나간 돈의 기록은 남는다. */
export const DELETE = withHandler({ params: loanIdParamsSchema }, (ctx, { params }) =>
  deleteLoan(ctx.householdId, params.id));
