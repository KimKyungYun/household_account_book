import { prisma } from '@/lib/prisma';
import { badRequest, conflict, notFound } from '@/lib/api/httpError';
import { currentYearMonth, monthRange, shiftYearMonth } from '@/utils/ts/formatDate';
import type { CreateAssetInput, UpdateAssetInput } from '@/service/asset/schema';
import type { AssetDto, AssetSummaryDto, AssetTrendPointDto } from '@/service/asset/type';

const ASSET_SELECT = {
  id: true,
  name: true,
  kind: true,
  colorHex: true,
  openingBalance: true,
  targetAmount: true,
  isActive: true,
  memo: true,
  owner: { select: { id: true, displayName: true, colorHex: true } },
} as const;

/**
 * 자산별로 들어간 금액을 한 번에 센다.
 *
 * 자산마다 따로 세면 자산 수만큼 쿼리가 나간다. groupBy 한 번이면 끝이고,
 * 거래가 하나도 없는 자산은 결과에 나오지 않으므로 0 으로 채운다.
 */
async function sumByAsset(householdId: string, before?: string) {
  const rows = await prisma.transaction.groupBy({
    by: ['assetId'],
    where: {
      householdId,
      assetId: { not: null },
      ...(before ? { date: { lt: new Date(before) } } : {}),
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return new Map(
    rows.map((row) => [row.assetId as string, { amount: row._sum.amount ?? 0, count: row._count._all }]),
  );
}

export async function listAssets(
  householdId: string,
  options: { includeInactive?: boolean } = {},
): Promise<AssetSummaryDto> {
  const [rows, added] = await Promise.all([
    prisma.asset.findMany({
      where: { householdId, ...(options.includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: ASSET_SELECT,
    }),
    sumByAsset(householdId),
  ]);

  const assets: AssetDto[] = rows.map((row) => {
    const hit = added.get(row.id);
    const addedAmount = hit?.amount ?? 0;

    return {
      ...row,
      addedAmount,
      balance: row.openingBalance + addedAmount,
      transactionCount: hit?.count ?? 0,
    };
  });

  // 이번 달에 새로 들어간 금액.
  const { from, toExclusive } = monthRange(currentYearMonth());
  const thisMonth = await prisma.transaction.aggregate({
    where: {
      householdId,
      assetId: { not: null },
      date: { gte: new Date(from), lt: new Date(toExclusive) },
    },
    _sum: { amount: true },
  });

  return {
    assets,
    totalBalance: assets.filter((asset) => asset.isActive).reduce((sum, asset) => sum + asset.balance, 0),
    addedThisMonth: thisMonth._sum.amount ?? 0,
  };
}

/**
 * 월별 누적 추이.
 *
 * 각 달의 잔액은 '시작 잔액 합 + 그 달 말까지 들어간 금액'이다. 달마다 따로 세면
 * 기간 길이만큼 쿼리가 나가므로, 기간 전체를 한 번에 받아 달별로 접는다.
 */
export async function getAssetTrend(
  householdId: string,
  from: string,
  to: string,
): Promise<AssetTrendPointDto[]> {
  const months: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    months.push(cursor);
    cursor = shiftYearMonth(cursor, 1);
  }

  const [opening, before, rows] = await Promise.all([
    prisma.asset.aggregate({ where: { householdId }, _sum: { openingBalance: true } }),
    // 기간이 시작되기 전까지 이미 쌓인 금액.
    prisma.transaction.aggregate({
      where: { householdId, assetId: { not: null }, date: { lt: new Date(monthRange(from).from) } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        householdId,
        assetId: { not: null },
        date: { gte: new Date(monthRange(from).from), lt: new Date(monthRange(to).toExclusive) },
      },
      select: { date: true, amount: true },
    }),
  ]);

  const addedByMonth = new Map<string, number>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 7);
    addedByMonth.set(key, (addedByMonth.get(key) ?? 0) + row.amount);
  }

  let running = (opening._sum.openingBalance ?? 0) + (before._sum.amount ?? 0);

  return months.map((yearMonth) => {
    const added = addedByMonth.get(yearMonth) ?? 0;
    running += added;

    return { yearMonth, balance: running, added };
  });
}

/**
 * 이 가구의 자산이 맞는지 확인한다.
 *
 * `assetId` 는 요청 본문으로 들어오므로 남의 가구 id 를 적어 보낼 수 있다. 막지 않으면
 * 그 거래가 남의 자산을 가리키고, 거래를 조회할 때 **남의 자산 이름이 응답에 실린다.**
 * 카테고리·결제수단과 같은 규칙으로 가구를 대조한다.
 */
export async function assertAssetUsable(householdId: string, assetId: string) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, householdId },
    select: { id: true, isActive: true },
  });
  if (!asset) throw badRequest('자산을 찾을 수 없습니다.', { assetId: '자산을 찾을 수 없습니다.' });
  if (!asset.isActive) throw badRequest('보관한 자산입니다.', { assetId: '보관한 자산입니다.' });
}

export async function createAsset(householdId: string, input: CreateAssetInput) {
  await assertOwnerUsable(householdId, input.ownerMemberId);

  const duplicated = await prisma.asset.findFirst({
    where: { householdId, name: input.name },
    select: { id: true },
  });
  if (duplicated) throw conflict('같은 이름의 자산이 이미 있습니다.');

  const last = await prisma.asset.findFirst({
    where: { householdId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  return prisma.asset.create({
    data: {
      householdId,
      name: input.name,
      kind: input.kind,
      ownerMemberId: input.ownerMemberId ?? null,
      colorHex: input.colorHex ?? null,
      openingBalance: input.openingBalance,
      targetAmount: input.targetAmount ?? null,
      memo: input.memo ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });
}

export async function updateAsset(householdId: string, id: string, input: UpdateAssetInput) {
  const current = await prisma.asset.findFirst({ where: { id, householdId }, select: { id: true } });
  if (!current) throw notFound('자산을 찾을 수 없습니다.');
  await assertOwnerUsable(householdId, input.ownerMemberId);

  if (input.name) {
    const duplicated = await prisma.asset.findFirst({
      where: { householdId, name: input.name, id: { not: id } },
      select: { id: true },
    });
    if (duplicated) throw conflict('같은 이름의 자산이 이미 있습니다.');
  }

  await prisma.asset.update({
    where: { id },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.kind === undefined ? {} : { kind: input.kind }),
      ...(input.ownerMemberId === undefined ? {} : { ownerMemberId: input.ownerMemberId }),
      ...(input.colorHex === undefined ? {} : { colorHex: input.colorHex }),
      ...(input.openingBalance === undefined ? {} : { openingBalance: input.openingBalance }),
      ...(input.targetAmount === undefined ? {} : { targetAmount: input.targetAmount }),
      ...(input.memo === undefined ? {} : { memo: input.memo }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    },
  });

  return { id };
}

/**
 * 자산을 지운다.
 *
 * **거래는 남긴다.** 적금에 넣은 돈은 실제로 통장에서 나간 기록이라, 자산을 지운다고
 * 함께 지우면 지난 달 합계가 통째로 바뀐다. 거래의 `assetId` 만 SetNull 로 끊긴다.
 */
export async function deleteAsset(householdId: string, id: string) {
  const current = await prisma.asset.findFirst({
    where: { id, householdId },
    select: { id: true, _count: { select: { transactions: true } } },
  });
  if (!current) throw notFound('자산을 찾을 수 없습니다.');

  await prisma.asset.delete({ where: { id } });

  return { keptTransactionCount: current._count.transactions };
}

async function assertOwnerUsable(householdId: string, ownerMemberId: string | null | undefined) {
  if (!ownerMemberId) return;

  const member = await prisma.householdMember.findFirst({
    where: { id: ownerMemberId, householdId },
    select: { id: true },
  });
  if (!member) throw notFound('구성원을 찾을 수 없습니다.');
}
