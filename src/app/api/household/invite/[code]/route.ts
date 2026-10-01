import { withPreOnboardingHandler } from '@/lib/api/withHandler';
import { findInvite } from '@/lib/repository/household';
import { inviteCodeParamsSchema } from '@/service/auth/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 합류 전에 초대 코드가 어느 가구인지 확인한다. 로그인한 사람만 물을 수 있다. */
export const GET = withPreOnboardingHandler({ params: inviteCodeParamsSchema }, (_ctx, { params }) =>
  findInvite(params.code));
