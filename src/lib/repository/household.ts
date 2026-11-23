import { prisma } from '@/lib/prisma';
import { badRequest, conflict, notFound } from '@/lib/api/httpError';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '@/lib/seed/defaults';
import { HOUSEHOLD_KIND_RULES, isRelationAllowed, memberColorOf, RELATION_LABEL, relationForKind } from '@/service/household/kind';
import type { HouseholdKind, MemberRelation } from '@/generated/prisma/enums';
import type { ResetCountsDto, ResetSummaryDto } from '@/service/household/type';

function assertRelation(kind: HouseholdKind, relation: MemberRelation) {
  if (!isRelationAllowed(kind, relation)) {
    const message = `${HOUSEHOLD_KIND_RULES[kind].label} 가구에서는 '${RELATION_LABEL[relation]}'을(를) 고를 수 없어요.`;
    throw badRequest(message, { relation: message });
  }
}

/**
 * 가구 생성 + 기본 카테고리·결제수단 시딩을 **한 트랜잭션**으로 처리한다.
 * 중간에 끊기면 카테고리 없는 가구가 남아 첫 화면이 전부 비어 버린다.
 */
export async function createHousehold(params: {
  userId: string;
  kind: HouseholdKind;
  householdName: string;
  displayName: string;
  relation: MemberRelation;
}) {
  assertRelation(params.kind, params.relation);

  const already = await prisma.householdMember.findUnique({
    where: { userId: params.userId },
    select: { householdId: true },
  });
  if (already) throw conflict('이미 가구에 속해 있어요.');

  return prisma.$transaction(async (tx) => {
    const household = await tx.household.create({ data: { name: params.householdName, kind: params.kind } });

    // 만든 사람이 첫 자리다. 색과 목록 순서가 들어온 순서를 따른다.
    const member = await tx.householdMember.create({
      data: {
        householdId: household.id,
        userId: params.userId,
        slot: 0,
        relation: params.relation,
        displayName: params.displayName,
        colorHex: memberColorOf(0),
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

/**
 * 초대 코드로 들어가기 전에 어느 가구인지 보여 준다. 합류 폼이 유형에 맞는 관계를 고르게 한다.
 * 코드를 아는 사람에게만 가구 이름·유형·남은 자리를 알려 준다.
 */
export async function findInvite(inviteCode: string) {
  const household = await prisma.household.findUnique({
    where: { inviteCode },
    select: { name: true, kind: true, _count: { select: { members: true } } },
  });
  if (!household) throw notFound('초대 코드를 찾을 수 없어요.');

  const capacity = HOUSEHOLD_KIND_RULES[household.kind].capacity;

  return {
    name: household.name,
    kind: household.kind,
    memberCount: household._count.members,
    capacity,
    isFull: household._count.members >= capacity,
  };
}

/** 초대 코드로 합류. 정원은 가구 유형이 정하고, 비어 있는 가장 앞 자리(slot)를 준다. */
export async function joinHousehold(params: {
  userId: string;
  inviteCode: string;
  displayName: string;
  relation: MemberRelation;
}) {
  const already = await prisma.householdMember.findUnique({
    where: { userId: params.userId },
    select: { householdId: true },
  });
  if (already) throw conflict('이미 가구에 속해 있어요.');

  const household = await prisma.household.findUnique({
    where: { inviteCode: params.inviteCode },
    select: { id: true, kind: true, members: { select: { slot: true } } },
  });
  if (!household) throw notFound('초대 코드를 찾을 수 없어요.');

  const rule = HOUSEHOLD_KIND_RULES[household.kind];
  if (household.members.length >= rule.capacity) {
    throw conflict(`이 가구는 정원(${rule.capacity}명)이 다 찼어요.`);
  }
  assertRelation(household.kind, params.relation);

  const takenSlots = new Set(household.members.map((member) => member.slot));
  const slot = Array.from({ length: rule.capacity }, (_, index) => index).find((index) => !takenSlots.has(index)) ?? 0;

  // 두 사람이 같은 자리를 동시에 잡으면 (householdId, slot) 유니크가 한쪽을 막는다.
  const member = await prisma.householdMember.create({
    data: {
      householdId: household.id,
      userId: params.userId,
      slot,
      relation: params.relation,
      displayName: params.displayName,
      colorHex: memberColorOf(slot),
    },
    select: { id: true, householdId: true },
  });

  return { householdId: member.householdId, memberId: member.id };
}

/**
 * 가구 유형을 바꾼다. 지금 인원이 새 정원보다 많으면 바꿀 수 없다.
 * 새 유형에서 고를 수 없는 관계는 가까운 것으로 옮긴다(남편 → 아빠 등).
 */
export async function changeHouseholdKind(householdId: string, kind: HouseholdKind) {
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    select: { id: true, relation: true },
  });

  const rule = HOUSEHOLD_KIND_RULES[kind];
  if (members.length > rule.capacity) {
    throw badRequest(`지금 ${members.length}명이 함께 쓰고 있어 ${rule.label} 장부(최대 ${rule.capacity}명)로 바꿀 수 없어요.`);
  }

  await prisma.$transaction([
    prisma.household.update({ where: { id: householdId }, data: { kind } }),
    ...members
      .filter((member) => !isRelationAllowed(kind, member.relation))
      .map((member) =>
        prisma.householdMember.update({
          where: { id: member.id },
          data: { relation: relationForKind(kind, member.relation) },
        })),
  ]);
}

export async function assertMemberRelations(householdId: string, relations: MemberRelation[]) {
  const household = await prisma.household.findUniqueOrThrow({ where: { id: householdId }, select: { kind: true } });
  for (const relation of relations) assertRelation(household.kind, relation);
}

/** 초기화 확인 창에 표시할 건수와 거래 기간. */
export async function getResetSummary(householdId: string): Promise<ResetSummaryDto> {
  const [transactions, assets, loans, recurringRules, range] = await Promise.all([
    prisma.transaction.count({ where: { householdId } }),
    prisma.asset.count({ where: { householdId } }),
    prisma.loan.count({ where: { householdId } }),
    prisma.recurringRule.count({ where: { householdId } }),
    prisma.transaction.aggregate({ where: { householdId }, _min: { date: true }, _max: { date: true } }),
  ]);

  return {
    transactions,
    assets,
    loans,
    recurringRules,
    firstDate: range._min.date?.toISOString().slice(0, 10) ?? null,
    lastDate: range._max.date?.toISOString().slice(0, 10) ?? null,
  };
}

/**
 * 거래·자산·대출·반복 거래를 모두 지운다. 분류·결제수단·예산·구성원·장부 설정은 남긴다.
 *
 * 한 트랜잭션으로 지워 중간에 실패하면 아무것도 지워지지 않는다. 순서는 다음과 같다.
 *  1. 거래 — 대출 회차·반복 회차의 거래 연결은 SetNull 로 끊긴다
 *  2. 반복 거래 — 회차 기록은 Cascade 로 함께 지워진다. 남기면 다음 접속 때 이번 달 거래를 다시 만든다
 *  3. 대출 — 상환 회차는 Cascade 로 함께 지워진다. 남기면 거래가 없는 지난 회차를 다시 적는다
 *  4. 자산
 */
export async function resetHouseholdData(householdId: string): Promise<ResetCountsDto> {
  return prisma.$transaction(async (tx) => {
    const transactions = await tx.transaction.deleteMany({ where: { householdId } });
    const recurringRules = await tx.recurringRule.deleteMany({ where: { householdId } });
    const loans = await tx.loan.deleteMany({ where: { householdId } });
    const assets = await tx.asset.deleteMany({ where: { householdId } });

    return {
      transactions: transactions.count,
      assets: assets.count,
      loans: loans.count,
      recurringRules: recurringRules.count,
    };
  });
}
