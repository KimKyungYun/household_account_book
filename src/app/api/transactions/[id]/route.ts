import { withHandler } from '@/lib/api/withHandler';
import { deleteTransaction, getTransaction, updateTransaction } from '@/lib/repository/transaction';
import { transactionIdParamsSchema, updateTransactionSchema } from '@/service/transaction/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ params: transactionIdParamsSchema }, (ctx, { params }) =>
  getTransaction(ctx.householdId, params.id));

export const PATCH = withHandler(
  { body: updateTransactionSchema, params: transactionIdParamsSchema },
  (ctx, { body, params }) => updateTransaction(ctx.householdId, params.id, body),
);

export const DELETE = withHandler({ params: transactionIdParamsSchema }, async (ctx, { params }) => {
  await deleteTransaction(ctx.householdId, params.id);
});
