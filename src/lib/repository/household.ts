import { prisma } from '@/lib/prisma';
import { conflict, notFound } from '@/lib/api/httpError';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, TOTAL_SHARE_BP } from '@/lib/seed/defaults';

const MAX_MEMBERS = 2;

/**
 * 가구 생성 + 기본 카테고리·결제수단 시딩을 **한 트랜잭션**으로 처리한다.
 * 중간에 끊기면 카테고리 없는 가구가 남아 첫 화면이 전부 비어 버린다.
 */
export async function createHousehold(params: {
  userId: string;
  householdName: string;
  displayName: string;
  slot: number;
}) {
  const already = await prisma.householdMember.findUnique({
    where: { userId: params.userId },
    select: { householdId: true },
  });
  if (already) throw conflict('이미 가구에 속해 있습니다.');

  return prisma.$transaction(async (tx) => {
    const household = await tx.household.create({ data: { name: params.householdName } });

    const member = await tx.householdMember.create({
      data: {
        householdId: household.id,
        userId: params.userId,
        slot: params.slot,
        displayName: params.displayName,
        colorHex: params.slot === 0 ? '#1f6feb' : '#d97706',
        defaultShareBp: TOTAL_SHARE_BP / MAX_MEMBERS,
      },
    });

    for (const group of DEFAULT_CATEGORIES) {
      for (const [groupIndex, parent] of group.categories.entries()) {
        const parentRow = await tx.category.create({
          data: {
            householdId: household.id,
            level: 1,
            kind: group.kind,
            name: parent.name,
            colorHex: parent.colorHex,
            sortOrder: groupIndex,
            isSystem: true,
            defaultSplitMode: parent.defaultSplitMode ?? null,
          },
        });

        await tx.category.createMany({
          data: parent.children.map((name, childIndex) => ({
            householdId: household.id,
            parentId: parentRow.id,
            level: 2,
            kind: group.kind,
            name,
            // 소분류는 대분류 색을 물려받는다 — 도넛·목록·배지가 한 색을 쓴다.
            colorHex: parent.colorHex,
            sortOrder: childIndex,
            isSystem: true,
            defaultSplitMode: parent.defaultSplitMode ?? null,
          })),
        });
      }
    }

    await tx.paymentMethod.createMany({
      data: DEFAULT_PAYMENT_METHODS.map((method, index) => ({
        householdId: household.id,
        name: method.name,
        kind: method.kind,
        sortOrder: index,
      })),
    });

    return { householdId: household.id, memberId: member.id, inviteCode: household.inviteCode };
  }, { timeout: 20_000 });
}

/** 배우자 합류. 정원은 2명이고, 남은 자리(slot)를 자동으로 준다. */
export async function joinHousehold(params: { userId: string; inviteCode: string; displayName: string }) {
  const already = await prisma.householdMember.findUnique({
    where: { userId: params.userId },
    select: { householdId: true },
  });
  if (already) throw conflict('이미 가구에 속해 있습니다.');

  const household = await prisma.household.findUnique({
    where: { inviteCode: params.inviteCode },
    select: { id: true, members: { select: { slot: true } } },
  });
  if (!household) throw notFound('초대 코드를 찾을 수 없습니다.');
  if (household.members.length >= MAX_MEMBERS) {
    throw conflict('이 가구는 이미 두 사람이 쓰고 있습니다.');
  }

  const takenSlots = new Set(household.members.map((member) => member.slot));
  const slot = takenSlots.has(0) ? 1 : 0;

  const member = await prisma.householdMember.create({
    data: {
      householdId: household.id,
      userId: params.userId,
      slot,
      displayName: params.displayName,
      colorHex: slot === 0 ? '#1f6feb' : '#d97706',
      defaultShareBp: TOTAL_SHARE_BP / MAX_MEMBERS,
    },
    select: { id: true, householdId: true },
  });

  return { householdId: member.householdId, memberId: member.id };
}
