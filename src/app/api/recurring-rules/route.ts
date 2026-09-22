import { withHandler } from '@/lib/api/withHandler';
import { createRecurringRule, listRecurringRules } from '@/lib/repository/recurring';
import { createRecurringSchema } from '@/service/recurring/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({}, (ctx) => listRecurringRules(ctx.householdId));

export const POST = withHandler({ body: createRecurringSchema }, (ctx, { body }) =>
  createRecurringRule(ctx.householdId, body));
