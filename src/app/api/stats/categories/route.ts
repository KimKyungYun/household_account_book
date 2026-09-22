import { withHandler } from '@/lib/api/withHandler';
import { getCategoryShares } from '@/lib/repository/stats';
import { categoryStatsQuerySchema } from '@/service/stats/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: categoryStatsQuerySchema }, (ctx, { query }) =>
  getCategoryShares(ctx.householdId, query.yearMonth, query.level, query.limit));
