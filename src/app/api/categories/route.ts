import { withHandler } from '@/lib/api/withHandler';
import { createCategory, getCategoryTree } from '@/lib/repository/category';
import { categoryTreeQuerySchema, createCategorySchema } from '@/service/category/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: categoryTreeQuerySchema }, (ctx, { query }) =>
  getCategoryTree(ctx.householdId, { kind: query.kind, includeInactive: query.includeInactive }));

export const POST = withHandler({ body: createCategorySchema }, (ctx, { body }) =>
  createCategory(ctx.householdId, body));
