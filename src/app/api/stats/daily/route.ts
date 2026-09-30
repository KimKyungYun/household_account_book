import { withHandler } from '@/lib/api/withHandler';
import { getDailyTotals } from '@/lib/repository/stats';
import { dailyQuerySchema } from '@/service/stats/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: dailyQuerySchema }, (ctx, { query }) =>
  getDailyTotals(ctx.householdId, query.yearMonth));
