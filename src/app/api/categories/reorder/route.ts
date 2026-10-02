import { withHandler } from '@/lib/api/withHandler';
import { reorderCategories } from '@/lib/repository/category';
import { reorderCategoriesSchema } from '@/service/category/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withHandler({ body: reorderCategoriesSchema }, async (ctx, { body }) => {
  await reorderCategories(ctx.householdId, body.orderedIds);
});
