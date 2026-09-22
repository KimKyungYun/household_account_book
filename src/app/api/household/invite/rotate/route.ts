import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { withHandler } from '@/lib/api/withHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 초대 코드를 새로 발급한다. 이전 코드는 즉시 못 쓰게 된다. */
export const POST = withHandler({}, async (ctx) => {
  const household = await prisma.household.update({
    where: { id: ctx.householdId },
    data: { inviteCode: randomUUID() },
    select: { inviteCode: true },
  });

  return household;
});
