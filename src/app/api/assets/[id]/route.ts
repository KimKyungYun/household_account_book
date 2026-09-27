import { withHandler } from '@/lib/api/withHandler';
import { deleteAsset, updateAsset } from '@/lib/repository/asset';
import { assetIdParamsSchema, updateAssetSchema } from '@/service/asset/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withHandler(
  { body: updateAssetSchema, params: assetIdParamsSchema },
  (ctx, { body, params }) => updateAsset(ctx.householdId, params.id, body),
);

/** 자산만 지운다. 이미 넣은 돈의 기록은 남는다. */
export const DELETE = withHandler({ params: assetIdParamsSchema }, (ctx, { params }) =>
  deleteAsset(ctx.householdId, params.id));
