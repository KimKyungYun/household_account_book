import { withHandler } from '@/lib/api/withHandler';
import { removeCategory } from '@/lib/repository/category';
import { categoryIdParamsSchema, mergeCategorySchema } from '@/service/category/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 쓰이는 곳을 다른 분류로 옮기고 이 분류(대분류면 딸린 소분류까지)를 지운다. */
export const POST = withHandler(
  { body: mergeCategorySchema, params: categoryIdParamsSchema },
  async (ctx, { body, params }) => {
    await removeCategory(ctx.householdId, params.id, body.intoCategoryId);
  },
);
