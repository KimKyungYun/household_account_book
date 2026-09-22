import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/api/httpError';
import { withHandler, withPreOnboardingHandler } from '@/lib/api/withHandler';
import { createHousehold } from '@/lib/repository/household';
import { createHouseholdSchema } from '@/service/auth/schema';
import { updateHouseholdSchema } from '@/service/household/schema';
import { TOTAL_SHARE_BP } from '@/lib/seed/defaults';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withPreOnboardingHandler({ body: createHouseholdSchema }, (ctx, { body }) =>
  createHousehold({
    userId: ctx.userId,
    householdName: body.householdName,
    displayName: body.displayName,
    slot: body.slot,
  }));

export const PATCH = withHandler({ body: updateHouseholdSchema }, async (ctx, { body }) => {
  if (body.members) {
    const sum = body.members.reduce((total, member) => total + member.defaultShareBp, 0);
    // 합이 100%가 아니면 정산이 총액과 어긋난다. 저장 전에 막는다.
    if (sum !== TOTAL_SHARE_BP) {
      throw badRequest('분담률의 합이 100%가 되어야 합니다.', {
        members: `현재 합계 ${(sum / 100).toFixed(0)}% — 100%로 맞춰 주세요.`,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    if (body.name) {
      await tx.household.update({ where: { id: ctx.householdId }, data: { name: body.name } });
    }

    for (const member of body.members ?? []) {
      await tx.householdMember.updateMany({
        where: { id: member.id, householdId: ctx.householdId },
        data: {
          displayName: member.displayName,
          colorHex: member.colorHex,
          defaultShareBp: member.defaultShareBp,
        },
      });
    }
  });

  return { id: ctx.householdId };
});
