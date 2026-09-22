import { withHandler } from '@/lib/api/withHandler';
import { copyBudgets } from '@/lib/repository/budget';
import { copyBudgetSchema } from '@/service/budget/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withHandler({ body: copyBudgetSchema }, (ctx, { body }) =>
  copyBudgets(ctx.householdId, body));
