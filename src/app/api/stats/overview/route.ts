import { withHandler } from '@/lib/api/withHandler';
import { getOverview } from '@/lib/repository/stats';
import { overviewQuerySchema } from '@/service/stats/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: overviewQuerySchema }, (ctx, { query }) =>
  getOverview(ctx.householdId, query.yearMonth));
