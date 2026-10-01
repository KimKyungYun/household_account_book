import { prisma } from '@/lib/prisma';
import { badRequest, conflict, forbidden, notFound } from '@/lib/api/httpError';
import type { CategoryKind, SplitMode } from '@/generated/prisma/enums';
import type { CategoryNodeDto, CategoryTreeDto } from '@/service/category/type';

const KIND_ORDER: CategoryKind[] = ['EXPENSE', 'INCOME', 'TRANSFER'];

/** 2단 트리 + 거래 건수. 한 번의 조회로 화면이 필요한 것을 다 만든다. */
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
      isSystem: true,
      defaultSplitMode: true,
      _count: { select: { transactions: true } },
    },
  });

  const toNode = (row: (typeof rows)[number]): CategoryNodeDto => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    level: row.level,
    icon: row.icon,
    colorHex: row.colorHex,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSystem: row.isSystem,
    defaultSplitMode: row.defaultSplitMode,
    transactionCount: row._count.transactions,
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
  // 대분류가 '0건'으로 보여 삭제해도 되는 것처럼 읽힌다.
  for (const root of roots) {
    root.transactionCount += root.children.reduce((sum, child) => sum + child.transactionCount, 0);
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
  },
) {
  const current = await prisma.category.findFirst({
    where: { id, householdId },
    select: { id: true, parentId: true, name: true, level: true },
  });
  if (!current) throw notFound('카테고리를 찾을 수 없어요.');

  if (input.name && input.name !== current.name) {
    const duplicate = await prisma.category.findFirst({
      where: { householdId, parentId: current.parentId, name: input.name, id: { not: id } },
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
    },
    select: { id: true },
  });
}

/**
 * 삭제는 거래가 하나도 없을 때만 허용한다.
 * 있으면 409 로 건수를 알려 주고, 화면이 '옮기고 삭제'(merge)로 유도한다.
 * 기본 카테고리(isSystem)는 개명만 되고 삭제되지 않는다.
 */
export async function deleteCategory(householdId: string, id: string) {
  const category = await prisma.category.findFirst({
    where: { id, householdId },
    select: {
      id: true,
      isSystem: true,
      _count: { select: { transactions: true, children: true, budgets: true, recurringRules: true } },
    },
  });
  if (!category) throw notFound('카테고리를 찾을 수 없어요.');
  if (category.isSystem) throw forbidden('기본 카테고리는 삭제할 수 없어요. 보관 처리해 주세요.');
  if (category._count.children > 0) throw conflict('소분류가 남아 있어요. 먼저 정리해 주세요.');
  if (category._count.transactions > 0) {
    throw conflict(`이 카테고리에 거래 ${category._count.transactions}건이 있어요. 다른 카테고리로 옮긴 뒤 지워 주세요.`);
  }
  if (category._count.recurringRules > 0) throw conflict('이 카테고리를 쓰는 반복 거래가 있어요.');

  await prisma.$transaction([
    prisma.budget.deleteMany({ where: { categoryId: id } }),
    prisma.category.delete({ where: { id } }),
  ]);
}

/** 거래·예산·반복규칙을 다른 카테고리로 통째로 옮기고 원본을 보관한다. */
export async function mergeCategory(householdId: string, id: string, intoCategoryId: string) {
  if (id === intoCategoryId) throw badRequest('같은 카테고리로는 옮길 수 없어요.');

  const [source, target] = await Promise.all([
    prisma.category.findFirst({ where: { id, householdId }, select: { id: true, kind: true, isSystem: true } }),
    prisma.category.findFirst({ where: { id: intoCategoryId, householdId }, select: { id: true, kind: true, level: true } }),
  ]);
  if (!source || !target) throw notFound('카테고리를 찾을 수 없어요.');
  if (source.kind !== target.kind) throw badRequest('종류가 다른 카테고리로는 옮길 수 없어요.');
  if (target.level !== 2) throw badRequest('소분류로만 옮길 수 있어요.');

  await prisma.$transaction(async (tx) => {
    await tx.transaction.updateMany({ where: { householdId, categoryId: id }, data: { categoryId: intoCategoryId } });
    await tx.recurringRule.updateMany({ where: { householdId, categoryId: id }, data: { categoryId: intoCategoryId } });
    // 예산은 (카테고리, 연월) 유니크라 그대로 옮기면 충돌한다. 원본 예산은 지운다.
    await tx.budget.deleteMany({ where: { householdId, categoryId: id } });

    if (source.isSystem) {
      await tx.category.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } });

      return;
    }
    await tx.category.delete({ where: { id } });
  });
}
