import { prisma } from '@/lib/prisma';
import { withPreOnboardingHandler } from '@/lib/api/withHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 화면이 필요한 것은 세션 토큰이 아니라 가구 프로필이다 —
 * 표시명·분담률·구성원 색이 있어야 거래 목록과 정산이 그려진다.
 * 그래서 SessionProvider 대신 이 엔드포인트 하나를 react-query 로 읽는다.
 */
export const GET = withPreOnboardingHandler({}, async (ctx) => {
  const member = ctx.memberId
    ? await prisma.householdMember.findUnique({
      where: { id: ctx.memberId },
      select: {
        id: true,
        slot: true,
        displayName: true,
        colorHex: true,
        defaultShareBp: true,
        household: { select: { id: true, name: true, currency: true, inviteCode: true } },
      },
    })
    : null;

  const members = member
    ? await prisma.householdMember.findMany({
      where: { householdId: member.household.id },
      orderBy: { slot: 'asc' },
      select: { id: true, slot: true, displayName: true, colorHex: true, defaultShareBp: true },
    })
    : [];

  return {
    user: { id: ctx.userId, email: ctx.email },
    member: member && {
      id: member.id,
      slot: member.slot,
      displayName: member.displayName,
      colorHex: member.colorHex,
      defaultShareBp: member.defaultShareBp,
    },
    household: member?.household ?? null,
    members,
  };
});
