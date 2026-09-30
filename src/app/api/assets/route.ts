import { withHandler } from '@/lib/api/withHandler';
import { createAsset, listAssets } from '@/lib/repository/asset';
import { createAssetSchema } from '@/service/asset/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({}, (ctx) => listAssets(ctx.householdId, { includeInactive: true }));

export const POST = withHandler({ body: createAssetSchema }, (ctx, { body }) =>
  createAsset(ctx.householdId, ctx.memberId, body));
