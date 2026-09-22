import { withHandler } from '@/lib/api/withHandler';
import { deleteCategory, updateCategory } from '@/lib/repository/category';
import { categoryIdParamsSchema, updateCategorySchema } from '@/service/category/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withHandler(
  { body: updateCategorySchema, params: categoryIdParamsSchema },
  (ctx, { body, params }) => updateCategory(ctx.householdId, params.id, body),
);

export const DELETE = withHandler({ params: categoryIdParamsSchema }, async (ctx, { params }) => {
  await deleteCategory(ctx.householdId, params.id);
});
