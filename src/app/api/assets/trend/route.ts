import { withHandler } from '@/lib/api/withHandler';
import { getAssetTrend } from '@/lib/repository/asset';
import { assetTrendQuerySchema } from '@/service/asset/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: assetTrendQuerySchema }, (ctx, { query }) =>
  getAssetTrend(ctx.householdId, query.from, query.to));
