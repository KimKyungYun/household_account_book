import { withPreOnboardingHandler } from '@/lib/api/withHandler';
import { joinHousehold } from '@/lib/repository/household';
import { joinHouseholdSchema } from '@/service/auth/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withPreOnboardingHandler({ body: joinHouseholdSchema }, (ctx, { body }) =>
  joinHousehold({ userId: ctx.userId, inviteCode: body.inviteCode, displayName: body.displayName }));
