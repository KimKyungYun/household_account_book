import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { badRequest, conflict, notFound } from '@/lib/api/httpError';
import { currentYearMonth, monthRange, shiftYearMonth } from '@/utils/ts/formatDate';
import type { AutoDepositInput, CreateAssetInput, UpdateAssetInput } from '@/service/asset/schema';
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

/**
 * 자산마다 붙은 '매달 자동으로 넣기' 규칙을 한 번에 가져온다.
 *
 * 자산별로 따로 세면 자산 수만큼 쿼리가 나간다. 한 번에 읽고 자산 id 로 묶는다.
 * 둘 이상 붙어 있으면 `hasMany` 로 표시만 하고 폼에서는 다루지 않는다 —
 * 폼이 임의로 하나를 골라 고치면 나머지가 조용히 남는다.
 */
async function autoDepositsByAsset(householdId: string) {
  const rules = await prisma.recurringRule.findMany({
    where: { householdId, isActive: true, assetId: { not: null }, freq: 'MONTHLY' },
    select: { id: true, assetId: true, amount: true, dayOfMonth: true },
    orderBy: { createdAt: 'asc' },
  });

  const grouped = new Map<string, { ruleId: string; amount: number; dayOfMonth: number; hasMany: boolean }>();
  for (const rule of rules) {
    const key = rule.assetId as string;
    const existing = grouped.get(key);
    if (existing) {
      existing.hasMany = true;
      continue;
    }
    grouped.set(key, {
      ruleId: rule.id,
      amount: rule.amount,
      dayOfMonth: rule.dayOfMonth ?? 1,
      hasMany: false,
    });
  }

  return grouped;
}

/**
 * 자동 적립 규칙이 쓸 기본 분류 — 이체 › 저축/투자 › 예적금.
 *
 * 자산 등록 폼에서 분류를 묻지 않기로 했으므로 서버가 고른다. 시드에서 만들어지는
 * 이름을 먼저 찾고, 사용자가 지웠다면 아무 이체 소분류나 쓴다. 그것마저 없으면
 * 규칙을 만들 수 없다고 알린다 — 말없이 건너뛰면 '켰는데 안 쌓이는' 상태가 된다.
 */
async function defaultTransferCategoryId(householdId: string): Promise<string> {
  const preferred = await prisma.category.findFirst({
    where: { householdId, kind: 'TRANSFER', isActive: true, name: '예적금' },
    select: { id: true },
  });
  if (preferred) return preferred.id;

  const fallback = await prisma.category.findFirst({
    where: { householdId, kind: 'TRANSFER', isActive: true, parentId: { not: null } },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  if (fallback) return fallback.id;

  throw badRequest(
    '자동으로 넣을 때 쓸 이체 분류가 없습니다. 분류 화면에서 이체 분류를 하나 만들어 주세요.',
    { autoDeposit: '이체 분류가 없습니다.' },
  );
}

export async function listAssets(
  householdId: string,
  options: { includeInactive?: boolean } = {},
): Promise<AssetSummaryDto> {
  const [rows, added, autoDeposits] = await Promise.all([
    prisma.asset.findMany({
      where: { householdId, ...(options.includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: ASSET_SELECT,
    }),
    sumByAsset(householdId),
    autoDepositsByAsset(householdId),
  ]);

  const assets: AssetDto[] = rows.map((row) => {
    const hit = added.get(row.id);
    const addedAmount = hit?.amount ?? 0;

    return {
      ...row,
      addedAmount,
      balance: row.openingBalance + addedAmount,
      transactionCount: hit?.count ?? 0,
      autoDeposit: autoDeposits.get(row.id) ?? null,
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

/**
 * 자산에 붙은 '매달 자동으로 넣기' 규칙을 요청대로 맞춘다.
 *
 * 규칙은 `TRANSFER` 로 만든다 — 적금에 넣는 돈은 쓴 돈이 아니라 자리를 옮긴 돈이라
 * 수입·지출 집계에서 빠져야 한다. 백필이 `assetId` 를 거래에 그대로 넘겨 잔액이 쌓인다.
 *
 * 규칙이 둘 이상 붙어 있으면 아무것도 하지 않는다. 어느 것을 고칠지 폼이 정할 수 없다.
 */
async function syncAutoDeposit(
  tx: Prisma.TransactionClient,
  ctx: { householdId: string; memberId: string; assetId: string; assetName: string },
  input: AutoDepositInput | null,
) {
  const existing = await tx.recurringRule.findMany({
    where: { householdId: ctx.householdId, assetId: ctx.assetId, isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (existing.length > 1) return;

  const current = existing[0];

  if (!input) {
    // 끈다 — 규칙을 지우지 않고 멈춘다. 지금까지 쌓인 거래와 회차 기록이 남아야 한다.
    if (current) await tx.recurringRule.update({ where: { id: current.id }, data: { isActive: false } });

    return;
  }

  const shape = {
    name: `${ctx.assetName} 자동 적립`,
    type: 'TRANSFER' as const,
    amount: input.amount,
    freq: 'MONTHLY' as const,
    interval: 1,
    dayOfMonth: input.dayOfMonth,
    splitMode: 'PERSONAL' as const,
    assetId: ctx.assetId,
  };

  if (current) {
    await tx.recurringRule.update({ where: { id: current.id }, data: shape });

    return;
  }

  await tx.recurringRule.create({
    data: {
      householdId: ctx.householdId,
      memberId: ctx.memberId,
      categoryId: await defaultTransferCategoryId(ctx.householdId),
      // 시작일을 이번 달 1일로 둬야 이번 달 회차부터 만들어진다.
      startDate: new Date(`${currentYearMonth()}-01T00:00:00.000Z`),
      ...shape,
    },
  });
}

export async function createAsset(householdId: string, memberId: string, input: CreateAssetInput) {
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

  // 자산과 자동 적립 규칙을 한 트랜잭션에 묶는다. 따로 만들면 자산만 생기고 규칙이
  // 실패한 상태가 남아, 사용자는 켰다고 생각하는데 돈이 쌓이지 않는다.
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.create({
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

    if (input.autoDeposit) {
      await syncAutoDeposit(
        tx,
        { householdId, memberId, assetId: asset.id, assetName: input.name },
        input.autoDeposit,
      );
    }

    return asset;
  });
}

export async function updateAsset(householdId: string, memberId: string, id: string, input: UpdateAssetInput) {
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

  await prisma.$transaction(async (tx) => {
    const updated = await tx.asset.update({
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
      select: { name: true },
    });

    // 생략하면 건드리지 않는다 — 이름만 고치러 온 요청이 적립 설정을 끄면 안 된다.
    if (input.autoDeposit !== undefined) {
      await syncAutoDeposit(
        tx,
        { householdId, memberId, assetId: id, assetName: updated.name },
        input.autoDeposit,
      );
    }
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
