import { withHandler } from '@/lib/api/withHandler';
import {
  backfillRecurringRule,
  deleteRecurringRule,
  setRecurringRuleActive,
  updateRecurringRule,
} from '@/lib/repository/recurring';
import { recurringIdParamsSchema, setActiveSchema, updateRecurringSchema } from '@/service/recurring/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 규칙을 고친 뒤에도 지난 회차를 채운다. 시작일을 앞으로 당기거나 결제일을 바꾸면
 * 이미 지나간 날짜가 새로 생기기 때문이다. 이미 만들어진 거래는 그대로 두고
 * 아직 없는 회차만 더한다 — 중복은 (ruleId, occurrenceDate) 유니크가 막는다.
 */
export const PATCH = withHandler(
  { body: updateRecurringSchema, params: recurringIdParamsSchema },
  async (ctx, { body, params }) => {
    const rule = await updateRecurringRule(ctx.householdId, params.id, body);
    const backfill = await backfillRecurringRule(ctx, rule.id);

    return { ...rule, backfill };
  },
);

/** 중지·재개. 규칙을 지우지 않고 멈추기만 한다. 재개하면 멈춰 있던 동안의 회차를 채운다. */
export const PUT = withHandler(
  { body: setActiveSchema, params: recurringIdParamsSchema },
  async (ctx, { body, params }) => {
    await setRecurringRuleActive(ctx.householdId, params.id, body.isActive);
    if (!body.isActive) return { backfill: null };

    return { backfill: await backfillRecurringRule(ctx, params.id) };
  },
);

/** 완전 삭제. 이미 만들어진 거래는 남는다. */
export const DELETE = withHandler({ params: recurringIdParamsSchema }, (ctx, { params }) =>
  deleteRecurringRule(ctx.householdId, params.id));
