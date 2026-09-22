import { withHandler } from '@/lib/api/withHandler';
import { backfillRecurringRule, createRecurringRule, listRecurringRules } from '@/lib/repository/recurring';
import { createRecurringSchema } from '@/service/recurring/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({}, (ctx) => listRecurringRules(ctx.householdId));

/**
 * 규칙을 만들고 **곧바로** 지난 회차를 거래로 채운다.
 *
 * 앱 진입 백필은 가구 단위로 하루 한 번만 돌아, 오늘 이미 돌았다면 오늘 만든 규칙을
 * 건너뛴다. 그러면 이번 달에 이미 지나간 결제일이 거래로 들어오지 않아 대시보드와
 * 예산·정산 합계에서 빠지고, 사용자는 하루를 기다려야 한다.
 */
export const POST = withHandler({ body: createRecurringSchema }, async (ctx, { body }) => {
  const rule = await createRecurringRule(ctx.householdId, body);
  const backfill = await backfillRecurringRule(ctx, rule.id);

  return { ...rule, backfill };
});
