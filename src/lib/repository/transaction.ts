import { prisma } from '@/lib/prisma';
import { assertAssetUsable } from '@/lib/repository/asset';
import { assertMemberUsable, assertPaymentMethodUsable } from '@/lib/repository/reference';
import { badRequest, conflict, notFound, staleWrite } from '@/lib/api/httpError';
import { monthRange } from '@/utils/ts/formatDate';
import type { Prisma } from '@/generated/prisma/client';
import type { CreateTransactionInput, TransactionListQuery, UpdateTransactionInput } from '@/service/transaction/schema';
import type { TransactionListDto, TransactionListItemDto } from '@/service/transaction/type';

/** 'YYYY-MM-DD' 문자열을 @db.Date 컬럼에 넣을 값으로. 시각을 붙이지 않는다. */
function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const ORDER_BY: Record<TransactionListQuery['sort'], Prisma.TransactionOrderByWithRelationInput[]> = {
  // 2차 키는 항상 id — 같은 날 거래의 순서가 페이지마다 흔들리지 않게 한다.
  'date.desc': [{ date: 'desc' }, { id: 'desc' }],
  'date.asc': [{ date: 'asc' }, { id: 'asc' }],
  'amount.desc': [{ amount: 'desc' }, { id: 'desc' }],
  'amount.asc': [{ amount: 'asc' }, { id: 'asc' }],
  'createdAt.desc': [{ createdAt: 'desc' }, { id: 'desc' }],
};

async function buildWhere(householdId: string, query: TransactionListQuery): Promise<Prisma.TransactionWhereInput> {
  const range = query.yearMonth
    ? monthRange(query.yearMonth)
    : { from: query.from, toExclusive: query.to ? toDateString(new Date(toDateOnly(query.to).getTime() + 86_400_000)) : undefined };

  // 대분류를 고르면 그 아래 소분류까지 포함한다 — 사용자는 '식비'를 골랐다고 생각한다.
  let categoryIds = query.categoryId;
  if (categoryIds) {
    const children = await prisma.category.findMany({
      where: { householdId, parentId: { in: [...categoryIds] } },
      select: { id: true },
    });
    categoryIds = [...categoryIds, ...children.map((child) => child.id)] as typeof categoryIds;
  }

  return {
    householdId,
    // 기본값에서 TRANSFER 를 뺀다 — 이체가 지출 목록에 섞이면 합계가 두 배로 보인다.
    type: { in: query.type ?? ['INCOME', 'EXPENSE'] },
    ...(range.from || range.toExclusive
      ? {
        date: {
          ...(range.from ? { gte: toDateOnly(range.from) } : {}),
          ...(range.toExclusive ? { lt: toDateOnly(range.toExclusive) } : {}),
        },
      }
      : {}),
    ...(query.memberId ? { memberId: { in: [...query.memberId] } } : {}),
    ...(categoryIds ? { categoryId: { in: [...categoryIds] } } : {}),
    ...(query.paymentMethodId ? { paymentMethodId: { in: [...query.paymentMethodId] } } : {}),
    ...(query.splitMode ? { splitMode: { in: [...query.splitMode] } } : {}),
    ...(query.q
      ? {
        OR: [
          { merchant: { contains: query.q, mode: 'insensitive' } },
          { memo: { contains: query.q, mode: 'insensitive' } },
        ],
      }
      : {}),
  };
}

const LIST_SELECT = {
  id: true,
  date: true,
  type: true,
  amount: true,
  splitMode: true,
  asset: { select: { id: true, name: true, colorHex: true } },
  merchant: true,
  memo: true,
  version: true,
  member: { select: { id: true, displayName: true, colorHex: true } },
  category: { select: { id: true, name: true, colorHex: true, parent: { select: { name: true } } } },
  paymentMethod: { select: { id: true, name: true } },
} satisfies Prisma.TransactionSelect;

function toListItem(row: Prisma.TransactionGetPayload<{ select: typeof LIST_SELECT }>): TransactionListItemDto {
  return {
    id: row.id,
    date: toDateString(row.date),
    type: row.type,
    amount: row.amount,
    member: row.member,
    category: row.category
      ? { id: row.category.id, name: row.category.name, parentName: row.category.parent?.name ?? null, colorHex: row.category.colorHex }
      : null,
    paymentMethod: row.paymentMethod,
    splitMode: row.splitMode,
    asset: row.asset,
    merchant: row.merchant,
    memo: row.memo,
    version: row.version,
  };
}

/**
 * 목록 + 현재 필터 전체 합계.
 *
 * 합계는 페이지 합계가 아니라 **필터 전체** 기준이다. 목록 상단에서 "이 조건으로 얼마 썼나"를
 * 바로 읽어야 하므로 같은 조건으로 groupBy 를 한 번 더 돈다.
 * 금액 필터는 ABS 기준이라 Prisma 로 표현할 수 없어 여기서만 raw 조건을 쓴다.
 */
export async function listTransactions(householdId: string, query: TransactionListQuery): Promise<TransactionListDto> {
  const where = await buildWhere(householdId, query);
  const amountFilter =
    query.minAmount !== undefined || query.maxAmount !== undefined
      ? {
        AND: [
          ...(query.minAmount !== undefined ? [{ OR: [{ amount: { gte: query.minAmount } }, { amount: { lte: -query.minAmount } }] }] : []),
          ...(query.maxAmount !== undefined ? [{ amount: { gte: -query.maxAmount, lte: query.maxAmount } }] : []),
        ],
      }
      : {};
  const finalWhere: Prisma.TransactionWhereInput = { ...where, ...amountFilter };

  const [rows, total, grouped] = await Promise.all([
    prisma.transaction.findMany({
      where: finalWhere,
      orderBy: ORDER_BY[query.sort],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: LIST_SELECT,
    }),
    prisma.transaction.count({ where: finalWhere }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: finalWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const sumOf = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER') =>
    grouped.find((group) => group.type === type)?._sum.amount ?? 0;

  const incomeTotal = sumOf('INCOME');
  const expenseTotal = sumOf('EXPENSE');

  return {
    items: rows.map(toListItem),
    page: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.max(1, Math.ceil(total / query.pageSize)) },
    summary: {
      incomeTotal,
      expenseTotal,
      transferTotal: sumOf('TRANSFER'),
      net: incomeTotal - expenseTotal,
      count: total,
    },
  };
}

export async function getTransaction(householdId: string, id: string) {
  const row = await prisma.transaction.findFirst({
    where: { id, householdId },
    select: LIST_SELECT,
  });
  if (!row) throw notFound('거래를 찾을 수 없습니다.');

  return toListItem(row);
}

/** 카테고리가 이 가구의 것이고, 종류가 맞고, 리프(소분류)인지 확인한다. */
async function assertCategoryUsable(householdId: string, categoryId: string, type: 'INCOME' | 'EXPENSE' | 'TRANSFER') {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId },
    select: { kind: true, level: true, isActive: true, defaultSplitMode: true },
  });
  if (!category) throw badRequest('카테고리를 찾을 수 없습니다.', { categoryId: '카테고리를 찾을 수 없습니다.' });
  if (category.kind !== type) throw badRequest('카테고리 종류가 맞지 않습니다.', { categoryId: '카테고리 종류가 맞지 않습니다.' });
  if (category.level !== 2) throw badRequest('소분류를 골라 주세요.', { categoryId: '소분류를 골라 주세요.' });
  if (!category.isActive) throw badRequest('보관된 카테고리입니다.', { categoryId: '보관된 카테고리입니다.' });

  return category;
}

export async function createTransaction(
  ctx: { householdId: string; userId: string },
  input: CreateTransactionInput,
) {
  if (input.clientRequestId) {
    const existing = await prisma.transaction.findFirst({
      where: { householdId: ctx.householdId, clientRequestId: input.clientRequestId },
      select: { id: true },
    });
    // 같은 키로 두 번 들어오면 앞서 만든 것을 그대로 돌려준다 — 중복 등록이 생기지 않는다.
    if (existing) return existing;
  }

  const category = input.categoryId ? await assertCategoryUsable(ctx.householdId, input.categoryId, input.type) : null;
  if (input.type === 'TRANSFER' && input.assetId) await assertAssetUsable(ctx.householdId, input.assetId);

  await assertMemberUsable(ctx.householdId, input.memberId);
  if (input.paymentMethodId) await assertPaymentMethodUsable(ctx.householdId, input.paymentMethodId);

  // 이체는 정산 대상이 아니므로 분담 모드를 가질 수 없다(DB CHECK 와 같은 규칙).
  const splitMode = input.type === 'TRANSFER'
    ? 'PERSONAL'
    : input.splitMode ?? category?.defaultSplitMode ?? 'SHARED';

  return prisma.transaction.create({
    data: {
      householdId: ctx.householdId,
      memberId: input.memberId,
      type: input.type,
      date: toDateOnly(input.date),
      amount: input.amount,
      categoryId: input.categoryId ?? null,
      paymentMethodId: input.paymentMethodId ?? null,
      splitMode,
      // 자산은 '옮긴 돈'에만 붙는다. 종류가 다르면 DB CHECK 가 막으므로 여기서 떨군다.
      assetId: input.type === 'TRANSFER' ? input.assetId ?? null : null,
      merchant: input.merchant || null,
      memo: input.memo || null,
      clientRequestId: input.clientRequestId ?? null,
      createdById: ctx.userId,
    },
    select: { id: true },
  });
}

export async function updateTransaction(householdId: string, id: string, input: UpdateTransactionInput) {
  const current = await prisma.transaction.findFirst({
    where: { id, householdId },
    select: { id: true, version: true, type: true, categoryId: true },
  });
  if (!current) throw notFound('거래를 찾을 수 없습니다.');
  if (current.version !== input.version) throw staleWrite();

  if (input.categoryId) await assertCategoryUsable(householdId, input.categoryId, current.type);
  if (input.assetId) await assertAssetUsable(householdId, input.assetId);
  if (input.memberId) await assertMemberUsable(householdId, input.memberId);
  if (input.paymentMethodId) await assertPaymentMethodUsable(householdId, input.paymentMethodId);

  const updated = await prisma.transaction.updateMany({
    where: { id, householdId, version: input.version },
    data: {
      ...(input.date === undefined ? {} : { date: toDateOnly(input.date) }),
      ...(input.amount === undefined ? {} : { amount: input.amount }),
      ...(input.memberId === undefined ? {} : { memberId: input.memberId }),
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
      ...(input.paymentMethodId === undefined ? {} : { paymentMethodId: input.paymentMethodId }),
      ...(input.splitMode === undefined ? {} : { splitMode: input.splitMode }),
      ...(input.assetId === undefined ? {} : { assetId: input.assetId }),
      ...(input.merchant === undefined ? {} : { merchant: input.merchant }),
      ...(input.memo === undefined ? {} : { memo: input.memo }),
      version: { increment: 1 },
    },
  });
  // updateMany 가 0건이면 그 사이에 상대가 먼저 저장했다는 뜻이다.
  if (updated.count === 0) throw staleWrite();

  return { id };
}

/**
 * 삭제. 반복 거래가 만든 건이면 회차를 '건너뜀'으로 남겨 다음 백필에서 되살아나지 않게 한다.
 * 이 처리가 없으면 지운 거래가 다음 접속에 다시 생긴다.
 */
export async function deleteTransaction(householdId: string, id: string) {
  const current = await prisma.transaction.findFirst({
    where: { id, householdId },
    select: { id: true, occurrence: { select: { id: true } }, transferPeerId: true },
  });
  if (!current) throw notFound('거래를 찾을 수 없습니다.');
  if (current.transferPeerId) throw conflict('이체는 짝 거래와 함께 처리해야 합니다.');

  await prisma.$transaction(async (tx) => {
    if (current.occurrence) {
      await tx.recurringOccurrence.update({
        where: { id: current.occurrence.id },
        data: { skipped: true, transactionId: null },
      });
    }
    await tx.transaction.delete({ where: { id } });
  });
}
