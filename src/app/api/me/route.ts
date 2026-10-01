import { prisma } from '@/lib/prisma';
import { withPreOnboardingHandler } from '@/lib/api/withHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 화면이 필요한 것은 세션 토큰이 아니라 가구 프로필이다 —
 * 표시명과 구성원 색이 있어야 거래 목록과 차트가 그려지고, 거래를 등록할 때
 * '누가 썼는지'를 고를 수 있다. 그래서 SessionProvider 대신 이 엔드포인트 하나를
 * react-query 로 읽는다.
 */
export const GET = withPreOnboardingHandler({}, async (ctx) => {
  const member = ctx.memberId
    ? await prisma.householdMember.findUnique({
      where: { id: ctx.memberId },
      select: {
        id: true,
        slot: true,
        relation: true,
        displayName: true,
        colorHex: true,
        household: { select: { id: true, name: true, kind: true, currency: true, inviteCode: true } },
      },
    })
    : null;

  const members = member
    ? await prisma.householdMember.findMany({
      where: { householdId: member.household.id },
      orderBy: { slot: 'asc' },
      select: { id: true, slot: true, relation: true, displayName: true, colorHex: true },
    })
    : [];

  return {
    user: { id: ctx.userId, email: ctx.email },
    member: member && {
      id: member.id,
      slot: member.slot,
      relation: member.relation,
      displayName: member.displayName,
      colorHex: member.colorHex,
    },
    household: member?.household ?? null,
    members,
  };
});
