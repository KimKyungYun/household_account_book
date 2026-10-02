import { prisma } from '@/lib/prisma';
import { badRequest, conflict, notFound } from '@/lib/api/httpError';
import type { CategoryKind, SplitMode } from '@/generated/prisma/enums';
import type { CategoryNodeDto, CategoryTreeDto } from '@/service/category/type';

const KIND_ORDER: CategoryKind[] = ['EXPENSE', 'INCOME', 'TRANSFER'];

/** 2단 트리 + 쓰이는 곳 건수. 한 번의 조회로 화면이 필요한 것을 다 만든다. */
export async function getCategoryTree(
  householdId: string,
  options: { kind?: CategoryKind; includeInactive?: boolean },
): Promise<CategoryTreeDto[]> {
  const rows = await prisma.category.findMany({
    where: {
      householdId,
      ...(options.kind ? { kind: options.kind } : {}),
      ...(options.includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ kind: 'asc' }, { level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      kind: true,
      level: true,
      parentId: true,
      icon: true,
      colorHex: true,
      sortOrder: true,
      isActive: true,
      defaultSplitMode: true,
      _count: { select: { transactions: true, recurringRules: true, loanInterests: true, loanPrincipals: true } },
    },
  });

  const toNode = (row: (typeof rows)[number]): CategoryNodeDto => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    level: row.level,
    parentId: row.parentId,
    icon: row.icon,
    colorHex: row.colorHex,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    defaultSplitMode: row.defaultSplitMode,
    transactionCount: row._count.transactions,
    recurringCount: row._count.recurringRules,
    loanCount: row._count.loanInterests + row._count.loanPrincipals,
    children: [],
  });

  const nodeById = new Map<string, CategoryNodeDto>();
  for (const row of rows) nodeById.set(row.id, toNode(row));

  const roots: CategoryNodeDto[] = [];
  for (const row of rows) {
    const node = nodeById.get(row.id);
    if (!node) continue;

    if (row.parentId) {
      nodeById.get(row.parentId)?.children.push(node);
      continue;
    }
    roots.push(node);
  }

  // 거래는 소분류에만 달린다. 대분류 건수를 직접 달린 것만 세면 하위에 2건이 있어도
  // 대분류가 '0건'으로 보여 지워도 되는 것처럼 읽힌다. 대분류를 지우면 소분류도 함께 없어지므로 다 더한다.
  for (const root of roots) {
    for (const child of root.children) {
      root.transactionCount += child.transactionCount;
      root.recurringCount += child.recurringCount;
      root.loanCount += child.loanCount;
    }
  }

  const kinds = options.kind ? [options.kind] : KIND_ORDER;

  return kinds.map((kind) => ({ kind, categories: roots.filter((node) => node.kind === kind) }));
}

export async function createCategory(
  householdId: string,
  input: {
    name: string;
    kind: CategoryKind;
    parentId?: string | null;
    colorHex?: string | null;
    icon?: string | null;
    defaultSplitMode?: SplitMode | null;
  },
) {
  let level = 1;

  if (input.parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: input.parentId, householdId },
      select: { level: true, kind: true },
    });
    if (!parent) throw notFound('상위 카테고리를 찾을 수 없어요.');
    if (parent.level !== 1) throw badRequest('소분류 아래에는 더 만들 수 없어요.');
    if (parent.kind !== input.kind) throw badRequest('상위 카테고리와 종류가 달라요.');
    level = 2;
  }

  const duplicate = await prisma.category.findFirst({
    where: { householdId, parentId: input.parentId ?? null, name: input.name },
    select: { id: true },
  });
  if (duplicate) throw conflict('같은 이름이 이미 있어요.', { name: '같은 이름이 이미 있어요.' });

  const last = await prisma.category.findFirst({
    where: { householdId, parentId: input.parentId ?? null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  return prisma.category.create({
    data: {
      householdId,
      parentId: input.parentId ?? null,
      level,
      kind: input.kind,
      name: input.name,
      colorHex: input.colorHex ?? null,
      // 소분류는 대분류의 아이콘을 따른다 — 자기 아이콘을 두지 않는다.
      icon: level === 1 ? input.icon ?? null : null,
      defaultSplitMode: input.defaultSplitMode ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });
}

export async function updateCategory(
  householdId: string,
  id: string,
  input: {
    name?: string;
    colorHex?: string | null;
    icon?: string | null;
    defaultSplitMode?: SplitMode | null;
    isActive?: boolean;
    sortOrder?: number;
    /** 소분류를 다른 대분류 밑으로 옮긴다. 거래는 소분류에 달려 있으니 그대로 따라간다. */
    parentId?: string;
  },
) {
  const current = await prisma.category.findFirst({
    where: { id, householdId },
    select: { id: true, parentId: true, name: true, level: true, kind: true },
  });
  if (!current) throw notFound('카테고리를 찾을 수 없어요.');

  const isMoving = input.parentId !== undefined && input.parentId !== current.parentId;
  let movedSortOrder: number | undefined;
  if (isMoving) {
    if (current.level !== 2) throw badRequest('큰 분류는 옮길 수 없어요.');
    const parent = await prisma.category.findFirst({
      where: { id: input.parentId, householdId },
      select: { level: true, kind: true },
    });
    if (!parent) throw notFound('옮길 큰 분류를 찾을 수 없어요.');
    if (parent.level !== 1) throw badRequest('큰 분류 밑으로만 옮길 수 있어요.');
    if (parent.kind !== current.kind) throw badRequest('종류가 다른 분류로는 옮길 수 없어요.');

    // 옮겨 간 곳에서는 맨 뒤에 선다.
    const last = await prisma.category.findFirst({
      where: { householdId, parentId: input.parentId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    movedSortOrder = (last?.sortOrder ?? -1) + 1;
  }

  // 이름 겹침은 '옮겨 갈 곳'에서 본다. 옮기면서 이름을 안 바꿔도 거기에 같은 이름이 있으면 막는다.
  const parentId = isMoving ? input.parentId : current.parentId;
  const name = input.name ?? current.name;
  if (isMoving || name !== current.name) {
    const duplicate = await prisma.category.findFirst({
      where: { householdId, parentId, name, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) throw conflict('같은 이름이 이미 있어요.', { name: '같은 이름이 이미 있어요.' });
  }

  // 대분류를 보관하면 딸린 소분류도 함께 보관한다 — 부모만 사라져 고아가 남는 상태를 막는다.
  if (input.isActive === false && current.level === 1) {
    await prisma.category.updateMany({ where: { householdId, parentId: id }, data: { isActive: false } });
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.colorHex === undefined ? {} : { colorHex: input.colorHex }),
      // 소분류 아이콘은 받지 않는다. 대분류를 따라간다.
      ...(input.icon === undefined || current.level !== 1 ? {} : { icon: input.icon }),
      ...(input.defaultSplitMode === undefined ? {} : { defaultSplitMode: input.defaultSplitMode }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive, archivedAt: input.isActive ? null : new Date() }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      ...(isMoving ? { parentId: input.parentId, sortOrder: movedSortOrder } : {}),
    },
    select: { id: true },
  });
}

/**
 * 같은 자리(같은 대분류 밑, 또는 같은 종류의 대분류끼리)의 순서를 받은 차례대로 다시 매긴다.
 * 위·아래로 한 칸씩 옮길 때 두 줄만 바꾸면 기존 sortOrder 가 겹쳐 있을 때 순서가 엉킨다.
 * 형제 전체를 0 부터 다시 매겨 그런 일을 없앤다.
 */
export async function reorderCategories(householdId: string, orderedIds: readonly string[]) {
  const rows = await prisma.category.findMany({
    where: { id: { in: [...orderedIds] }, householdId },
    select: { id: true, parentId: true, kind: true },
  });
  if (rows.length !== orderedIds.length) throw notFound('카테고리를 찾을 수 없어요.');

  const [first] = rows;
  if (first && rows.some((row) => row.parentId !== first.parentId || row.kind !== first.kind)) {
    throw badRequest('같은 자리의 분류끼리만 순서를 바꿀 수 있어요.');
  }

  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.category.update({ where: { id }, data: { sortOrder: index } })),
  );
}

/**
 * 분류를 지운다. 대분류면 딸린 소분류까지 함께 지운다.
 *
 * 거래·반복 거래·대출이 이 분류(들)를 쓰고 있으면 `intoCategoryId` 로 옮길 곳을 받아
 * 한 번에 옮긴 뒤 지운다. 옮길 곳 없이 부르면 409 로 돌려보낸다 — 화면이 옮길 곳을 고르게 한다.
 * 예산은 (분류, 연월) 유니크라 옮기면 겹친다. 지우는 분류의 예산은 함께 지운다.
 */
export async function removeCategory(householdId: string, id: string, intoCategoryId?: string) {
  const category = await prisma.category.findFirst({
    where: { id, householdId },
    select: { id: true, kind: true, children: { select: { id: true } } },
  });
  if (!category) throw notFound('카테고리를 찾을 수 없어요.');

  const ids = [category.id, ...category.children.map((child) => child.id)];
  const inIds = { in: ids };

  const [transactions, recurringRules, loans] = await Promise.all([
    prisma.transaction.count({ where: { householdId, categoryId: inIds } }),
    prisma.recurringRule.count({ where: { householdId, categoryId: inIds } }),
    prisma.loan.count({ where: { householdId, OR: [{ interestCategoryId: inIds }, { principalCategoryId: inIds }] } }),
  ]);
  const isInUse = transactions + recurringRules + loans > 0;

  if (isInUse) {
    if (!intoCategoryId) throw conflict('이 분류를 쓰는 곳이 있어요. 옮길 분류를 골라 주세요.');
    if (ids.includes(intoCategoryId)) throw badRequest('지우는 분류로는 옮길 수 없어요.');

    const target = await prisma.category.findFirst({
      where: { id: intoCategoryId, householdId },
      select: { kind: true, level: true, isActive: true },
    });
    if (!target) throw notFound('옮길 분류를 찾을 수 없어요.');
    if (target.kind !== category.kind) throw badRequest('종류가 다른 분류로는 옮길 수 없어요.');
    if (target.level !== 2) throw badRequest('세부 분류로만 옮길 수 있어요.');
    if (!target.isActive) throw badRequest('보관된 분류로는 옮길 수 없어요.');
  }

  await prisma.$transaction(async (tx) => {
    if (isInUse && intoCategoryId) {
      await tx.transaction.updateMany({ where: { householdId, categoryId: inIds }, data: { categoryId: intoCategoryId } });
      await tx.recurringRule.updateMany({ where: { householdId, categoryId: inIds }, data: { categoryId: intoCategoryId } });
      await tx.loan.updateMany({ where: { householdId, interestCategoryId: inIds }, data: { interestCategoryId: intoCategoryId } });
      await tx.loan.updateMany({ where: { householdId, principalCategoryId: inIds }, data: { principalCategoryId: intoCategoryId } });
    }
    await tx.budget.deleteMany({ where: { householdId, categoryId: inIds } });
    // 자식부터 지운다. 부모를 먼저 지우면 parentId 외래키에 걸린다.
    await tx.category.deleteMany({ where: { householdId, parentId: category.id } });
    await tx.category.delete({ where: { id: category.id } });
  });
}
