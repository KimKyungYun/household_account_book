import { withHandler } from '@/lib/api/withHandler';
import { createTransaction, listTransactions } from '@/lib/repository/transaction';
import { createTransactionSchema, transactionListQuerySchema } from '@/service/transaction/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: transactionListQuerySchema }, (ctx, { query }) =>
  listTransactions(ctx.householdId, query));

export const POST = withHandler({ body: createTransactionSchema }, (ctx, { body }) =>
  createTransaction({ householdId: ctx.householdId, userId: ctx.userId }, body));
