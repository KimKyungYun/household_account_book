import { withHandler } from '@/lib/api/withHandler';
import { getBudgetMonth, putBudgets } from '@/lib/repository/budget';
import { budgetQuerySchema, putBudgetsSchema } from '@/service/budget/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: budgetQuerySchema }, (ctx, { query }) =>
  getBudgetMonth(ctx.householdId, query.yearMonth));

export const PUT = withHandler({ body: putBudgetsSchema }, (ctx, { body }) =>
  putBudgets(ctx.householdId, body));
