import { withHandler } from '@/lib/api/withHandler';
import { deleteAsset, updateAsset } from '@/lib/repository/asset';
import { assetIdParamsSchema, updateAssetSchema } from '@/service/asset/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withHandler(
  { body: updateAssetSchema, params: assetIdParamsSchema },
  (ctx, { body, params }) => updateAsset(ctx.householdId, ctx.memberId, params.id, body),
);

/** 자산과 자동으로 넣던 규칙, 그 규칙이 이번 달에 만든 거래를 지운다. 지난 기록은 남는다. */
export const DELETE = withHandler({ params: assetIdParamsSchema }, (ctx, { params }) =>
  deleteAsset(ctx.householdId, params.id));
