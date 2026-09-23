import { prisma } from '@/lib/prisma';
import { withHandler, withPreOnboardingHandler } from '@/lib/api/withHandler';
import { createHousehold } from '@/lib/repository/household';
import { createHouseholdSchema } from '@/service/auth/schema';
import { updateHouseholdSchema } from '@/service/household/schema';

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
        },
      });
    }
  });

  return { id: ctx.householdId };
});
