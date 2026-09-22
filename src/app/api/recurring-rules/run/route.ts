import { withHandler } from '@/lib/api/withHandler';
import { backfillRecurring } from '@/lib/repository/recurring';
import { runRecurringSchema } from '@/service/recurring/schema';
import { todayInSeoul } from '@/utils/ts/formatDate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 설정 화면의 '지금 생성' 버튼. 앱 진입 시 백필과 같은 함수를 쓴다. */
export const POST = withHandler({ body: runRecurringSchema }, (ctx, { body }) =>
  backfillRecurring({ householdId: ctx.householdId, userId: ctx.userId }, body.until ?? todayInSeoul()));
