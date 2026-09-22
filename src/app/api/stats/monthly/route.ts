import { withHandler } from '@/lib/api/withHandler';
import { getMonthlyTrend } from '@/lib/repository/stats';
import { monthlyQuerySchema } from '@/service/stats/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: monthlyQuerySchema }, (ctx, { query }) =>
  getMonthlyTrend(ctx.householdId, query.from, query.to));
