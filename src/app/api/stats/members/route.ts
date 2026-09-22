import { withHandler } from '@/lib/api/withHandler';
import { getMemberStats } from '@/lib/repository/stats';
import { memberStatsQuerySchema } from '@/service/stats/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: memberStatsQuerySchema }, (ctx, { query }) =>
  getMemberStats(ctx.householdId, query.yearMonth));
