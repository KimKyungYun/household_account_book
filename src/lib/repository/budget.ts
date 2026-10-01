import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/api/httpError';
import { monthRange } from '@/utils/ts/formatDate';
import type { BudgetMonthDto, BudgetRowDto, BudgetStatus } from '@/service/budget/type';
import type { CopyBudgetInput, PutBudgetsInput } from '@/service/budget/schema';

const WARNING_THRESHOLD = 0.8;

function statusOf(budgetAmount: number | null, actualAmount: number): BudgetStatus {
  if (budgetAmount === null) return 'NO_BUDGET';
  // 0원 예산은 의도적 설정이다 — 1원만 써도 초과로 본다.
  if (budgetAmount === 0) return actualAmount > 0 ? 'OVER' : 'UNDER';
  if (actualAmount > budgetAmount) return 'OVER';

  return actualAmount / budgetAmount >= WARNING_THRESHOLD ? 'WARNING' : 'UNDER';
}

/**
 * 예산 대비 실적.
 *
 * 대분류의 실적은 **하위 소분류 합계 + 대분류 직접 지출**이다.
 * 소분류 예산은 독립 라인으로 두고 대분류 예산과 합산하지 않는다 — 이중 계상을 막는다.
 */
export async function getBudgetMonth(householdId: string, yearMonth: string): Promise<BudgetMonthDto> {
  const { from, toExclusive } = monthRange(yearMonth);

  const [categories, budgets, actuals] = await Promise.all([
    prisma.category.findMany({
      where: { householdId, kind: 'EXPENSE' },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, level: true, parentId: true, isActive: true, parent: { select: { name: true } } },
    }),
    prisma.budget.findMany({
      where: { householdId, yearMonth },
      select: { categoryId: true, amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        householdId,
        type: 'EXPENSE',
        date: { gte: new Date(from), lt: new Date(toExclusive) },
      },
      _sum: { amount: true },
    }),
  ]);

  const budgetByCategory = new Map(budgets.map((budget) => [budget.categoryId, budget.amount]));
  const actualByCategory = new Map(
    actuals.filter((row) => row.categoryId).map((row) => [row.categoryId as string, row._sum.amount ?? 0]),
  );

  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = childrenByParent.get(category.parentId) ?? [];
    list.push(category.id);
    childrenByParent.set(category.parentId, list);
  }

  const rows: BudgetRowDto[] = [];

  for (const category of categories) {
    const budgetAmount = budgetByCategory.get(category.id) ?? null;
    const own = actualByCategory.get(category.id) ?? 0;
    const actualAmount =
      category.level === 1
        ? own + (childrenByParent.get(category.id) ?? []).reduce((sum, id) => sum + (actualByCategory.get(id) ?? 0), 0)
        : own;

    // 보관된 카테고리는 실적도 예산도 없으면 보여주지 않는다.
    if (!category.isActive && budgetAmount === null && actualAmount === 0) continue;

    rows.push({
      categoryId: category.id,
      name: category.name,
      parentName: category.parent?.name ?? null,
      level: category.level,
      budgetAmount,
      actualAmount,
      remaining: budgetAmount === null ? null : budgetAmount - actualAmount,
      usageRate: budgetAmount === null ? null : budgetAmount === 0 ? (actualAmount > 0 ? 1 : 0) : actualAmount / budgetAmount,
      status: statusOf(budgetAmount, actualAmount),
    });
  }

  // 총계는 대분류 예산만 더한다 — 소분류까지 더하면 같은 돈을 두 번 센다.
  const parentRows = rows.filter((row) => row.level === 1);
  const budgetTotal = parentRows.reduce((sum, row) => sum + (row.budgetAmount ?? 0), 0);
  const actualTotal = parentRows.reduce((sum, row) => sum + row.actualAmount, 0);

  return {
    yearMonth,
    rows,
    totals: {
      budgetAmount: budgetTotal,
      actualAmount: actualTotal,
      remaining: budgetTotal - actualTotal,
      usageRate: budgetTotal === 0 ? null : actualTotal / budgetTotal,
    },
  };
}

export async function putBudgets(householdId: string, input: PutBudgetsInput) {
  const ids = input.items.map((item) => item.categoryId);
  const owned = await prisma.category.findMany({
    where: { id: { in: ids }, householdId, kind: 'EXPENSE' },
    select: { id: true },
  });
  if (owned.length !== new Set(ids).size) throw badRequest('카테고리를 찾을 수 없습니다.');

  // 항목마다 upsert 를 돌면 카테고리 수만큼 왕복한다. 이번에 손댄 카테고리의 행을 지우고
  // 값이 있는 것만 다시 넣으면 항목 수와 무관하게 두 번이면 된다(copyBudgets 와 같은 방식).
  const filled = input.items.filter((item): item is typeof item & { amount: number } => item.amount !== null);
  await prisma.$transaction([
    prisma.budget.deleteMany({ where: { householdId, yearMonth: input.yearMonth, categoryId: { in: ids } } }),
    prisma.budget.createMany({
      data: filled.map((item) => ({ householdId, categoryId: item.categoryId, yearMonth: input.yearMonth, amount: item.amount })),
    }),
  ]);

  return { yearMonth: input.yearMonth };
}

/** 전월 예산을 그대로 가져온다. 매달 같은 금액을 다시 넣는 일을 없앤다. */
export async function copyBudgets(householdId: string, input: CopyBudgetInput) {
  const source = await prisma.budget.findMany({
    where: { householdId, yearMonth: input.fromYearMonth },
    select: { categoryId: true, amount: true },
  });
  if (source.length === 0) throw badRequest('가져올 예산이 없습니다.');

  await prisma.$transaction(async (tx) => {
    if (input.overwrite) {
      await tx.budget.deleteMany({ where: { householdId, yearMonth: input.toYearMonth } });
    }

    await tx.budget.createMany({
      data: source.map((budget) => ({
        householdId,
        categoryId: budget.categoryId,
        yearMonth: input.toYearMonth,
        amount: budget.amount,
      })),
      skipDuplicates: true,
    });
  });

  return { copied: source.length };
}
