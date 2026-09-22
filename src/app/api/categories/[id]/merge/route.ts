import { withHandler } from '@/lib/api/withHandler';
import { mergeCategory } from '@/lib/repository/category';
import { categoryIdParamsSchema, mergeCategorySchema } from '@/service/category/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withHandler(
  { body: mergeCategorySchema, params: categoryIdParamsSchema },
  async (ctx, { body, params }) => {
    await mergeCategory(ctx.householdId, params.id, body.intoCategoryId);
  },
);
