import { prisma } from '@/lib/prisma';
import { withHandler, withPreOnboardingHandler } from '@/lib/api/withHandler';
import { assertMemberRelations, changeHouseholdKind, createHousehold } from '@/lib/repository/household';
import { createHouseholdSchema } from '@/service/auth/schema';
import { updateHouseholdSchema } from '@/service/household/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withPreOnboardingHandler({ body: createHouseholdSchema }, (ctx, { body }) =>
  createHousehold({
    userId: ctx.userId,
    kind: body.kind,
    householdName: body.householdName,
    displayName: body.displayName,
    relation: body.relation,
  }));

/**
 * 가구 설정 저장. 유형을 먼저 바꾸고, 그 유형에 맞는지 본 뒤에 구성원 관계를 적는다 —
 * 순서가 거꾸로면 '가족으로 바꾸면서 아빠로 고친' 요청이 부부 기준으로 거절된다.
 */
export const PATCH = withHandler({ body: updateHouseholdSchema }, async (ctx, { body }) => {
  if (body.kind) await changeHouseholdKind(ctx.householdId, body.kind);
  if (body.members) await assertMemberRelations(ctx.householdId, body.members.map((member) => member.relation));

  await prisma.$transaction(async (tx) => {
    if (body.name) {
      await tx.household.update({ where: { id: ctx.householdId }, data: { name: body.name } });
    }

    for (const member of body.members ?? []) {
      await tx.householdMember.updateMany({
        where: { id: member.id, householdId: ctx.householdId },
        data: { displayName: member.displayName, relation: member.relation },
      });
    }
  });

  return { id: ctx.householdId };
});
