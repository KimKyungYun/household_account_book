import { withHandler } from '@/lib/api/withHandler';
import { getMonthlySettlement } from '@/lib/repository/settlement';
import { settlementQuerySchema } from '@/service/settlement/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: settlementQuerySchema }, (ctx, { query }) =>
  getMonthlySettlement(ctx.householdId, query.yearMonth));
