import { withHandler } from '@/lib/api/withHandler';
import { deactivateRecurringRule, updateRecurringRule } from '@/lib/repository/recurring';
import { recurringIdParamsSchema, updateRecurringSchema } from '@/service/recurring/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withHandler(
  { body: updateRecurringSchema, params: recurringIdParamsSchema },
  (ctx, { body, params }) => updateRecurringRule(ctx.householdId, params.id, body),
);

export const DELETE = withHandler({ params: recurringIdParamsSchema }, async (ctx, { params }) => {
  await deactivateRecurringRule(ctx.householdId, params.id);
});
