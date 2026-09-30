import { withHandler } from '@/lib/api/withHandler';
import { getLoanSchedule } from '@/lib/repository/loan';
import { loanIdParamsSchema } from '@/service/loan/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ params: loanIdParamsSchema }, (ctx, { params }) =>
  getLoanSchedule(ctx.householdId, params.id));
