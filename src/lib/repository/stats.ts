import { prisma } from '@/lib/prisma';
import { monthRange, shiftYearMonth } from '@/utils/ts/formatDate';
import type { CategoryShareDto, MemberStatDto, MonthlyPointDto, OverviewDto } from '@/service/stats/type';

/**
 * 집계는 전부 그때그때 계산한다. 2인 가구는 10년이면 3만 행 수준이라
 * GROUP BY 가 한 자릿수 ms 다 — 월 마감 스냅샷 테이블을 둘 이유가 없다.
 * (정산 확정만 예외다. 그건 성능이 아니라 '합의한 사실 동결'이 목적이다)
 */
async function totalsOf(householdId: string, yearMonth: string) {
  const { from, toExclusive } = monthRange(yearMonth);

  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: { householdId, date: { gte: new Date(from), lt: new Date(toExclusive) } },
    _sum: { amount: true },
  });

  const sumOf = (type: 'INCOME' | 'EXPENSE') => grouped.find((row) => row.type === type)?._sum.amount ?? 0;
  const income = sumOf('INCOME');
  const expense = sumOf('EXPENSE');

  return { income, expense, net: income - expense };
}

export async function getOverview(householdId: string, yearMonth: string): Promise<OverviewDto> {
  const { from, toExclusive } = monthRange(yearMonth);

  const [current, prev, pendingCount] = await Promise.all([
    totalsOf(householdId, yearMonth),
    totalsOf(householdId, shiftYearMonth(yearMonth, -1)),
    prisma.transaction.count({
      where: { householdId, status: 'PENDING', date: { gte: new Date(from), lt: new Date(toExclusive) } },
    }),
  ]);

  return {
    yearMonth,
    ...current,
    prev,
    // 전월이 0원이면 증감률을 낼 수 없다. 화면에서 Infinity 를 만들지 않게 서버가 null 로 정한다.
    expenseDeltaRate: prev.expense === 0 ? null : (current.expense - prev.expense) / prev.expense,
    pendingCount,
  };
}

export async function getMonthlyTrend(householdId: string, from: string, to: string): Promise<MonthlyPointDto[]> {
  const months: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    months.push(cursor);
    cursor = shiftYearMonth(cursor, 1);
  }

  const start = monthRange(months[0] ?? from).from;
  const end = monthRange(months[months.length - 1] ?? to).toExclusive;

  const rows = await prisma.transaction.findMany({
    where: { householdId, type: { in: ['INCOME', 'EXPENSE'] }, date: { gte: new Date(start), lt: new Date(end) } },
    select: { date: true, type: true, amount: true },
  });

  return months.map((yearMonth) => {
    const mine = rows.filter((row) => row.date.toISOString().slice(0, 7) === yearMonth);
    const income = mine.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0);
    const expense = mine.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0);

    return { yearMonth, income, expense, net: income - expense };
  });
}

export async function getCategoryShares(
  householdId: string,
  yearMonth: string,
  level: number,
  limit: number,
): Promise<CategoryShareDto[]> {
  const current = monthRange(yearMonth);
  const previous = monthRange(shiftYearMonth(yearMonth, -1));

  const [rows, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        householdId,
        type: 'EXPENSE',
        date: { gte: new Date(previous.from), lt: new Date(current.toExclusive) },
      },
      select: { date: true, amount: true, categoryId: true },
    }),
    prisma.category.findMany({
      where: { householdId, kind: 'EXPENSE' },
      select: { id: true, name: true, colorHex: true, level: true, parentId: true },
    }),
  ]);

  const byId = new Map(categories.map((category) => [category.id, category]));
  // 대분류 비중을 볼 때는 소분류 지출을 부모로 올려 센다.
  const bucketOf = (categoryId: string | null) => {
    if (!categoryId) return null;
    const category = byId.get(categoryId);
    if (!category) return null;
    if (level === 2) return category.level === 2 ? category.id : null;

    return category.level === 1 ? category.id : category.parentId;
  };

  const sums = new Map<string, { amount: number; prevAmount: number }>();
  for (const row of rows) {
    const bucket = bucketOf(row.categoryId);
    if (!bucket) continue;

    const isCurrent = row.date.toISOString().slice(0, 10) >= current.from;
    const entry = sums.get(bucket) ?? { amount: 0, prevAmount: 0 };
    if (isCurrent) entry.amount += row.amount;
    else entry.prevAmount += row.amount;
    sums.set(bucket, entry);
  }

  const total = [...sums.values()].reduce((sum, entry) => sum + entry.amount, 0);

  return [...sums.entries()]
    .map(([categoryId, entry]) => ({
      categoryId,
      name: byId.get(categoryId)?.name ?? '분류 없음',
      colorHex: byId.get(categoryId)?.colorHex ?? null,
      amount: entry.amount,
      share: total === 0 ? 0 : entry.amount / total,
      prevAmount: entry.prevAmount,
    }))
    .filter((row) => row.amount !== 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export async function getMemberStats(householdId: string, yearMonth: string): Promise<MemberStatDto[]> {
  const { from, toExclusive } = monthRange(yearMonth);

  const [members, rows] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { slot: 'asc' },
      select: { id: true, displayName: true, colorHex: true },
    }),
    prisma.transaction.findMany({
      where: { householdId, date: { gte: new Date(from), lt: new Date(toExclusive) } },
      select: { memberId: true, type: true, amount: true, splitMode: true },
    }),
  ]);

  return members.map((member) => {
    const mine = rows.filter((row) => row.memberId === member.id);
    const expenses = mine.filter((row) => row.type === 'EXPENSE');

    return {
      memberId: member.id,
      displayName: member.displayName,
      colorHex: member.colorHex,
      paidIncome: mine.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0),
      paidExpense: expenses.reduce((sum, row) => sum + row.amount, 0),
      sharedPaid: expenses.filter((row) => row.splitMode !== 'PERSONAL').reduce((sum, row) => sum + row.amount, 0),
      personalPaid: expenses.filter((row) => row.splitMode === 'PERSONAL').reduce((sum, row) => sum + row.amount, 0),
    };
  });
}
