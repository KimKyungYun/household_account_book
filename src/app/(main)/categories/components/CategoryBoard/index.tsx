'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import SegmentedControl from '@/components/common/SegmentedControl';
import { SkeletonRows } from '@/components/common/Skeleton';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryTree, reorderCategories } from '@/service/category';
import type { CategoryKind } from '@/generated/prisma/enums';
import type { CategoryNodeDto, CategoryTreeDto } from '@/service/category/type';
import CategoryDeleteModal from '@/components/category/CategoryDeleteModal';
import CategoryFormModal, { categoryFormKey } from '@/components/category/CategoryFormModal';
import type { CategoryFormTarget } from '@/components/category/CategoryFormModal';
import CategoryGroup from '../CategoryGroup';
import styles from './CategoryBoard.module.scss';
import type { MoveOffset } from '../CategoryGroup';

const KIND_OPTIONS = [
  { value: 'EXPENSE', label: '쓴 돈' },
  { value: 'INCOME', label: '번 돈' },
  { value: 'TRANSFER', label: '옮긴 돈' },
] as const;

const KIND_HINT: Record<CategoryKind, string> = {
  EXPENSE: '쓴 돈을 나누어 적는 분류예요.',
  INCOME: '번 돈을 나누어 적는 분류예요. 급여, 상여처럼요.',
  TRANSFER:
    '계좌끼리 옮긴 돈, 카드값, 적금 납입처럼 쓴 것도 번 것도 아닌 돈이에요. 합계에서는 빠져요.',
};

/** 트리 캐시에서 한 자리(대분류끼리, 또는 한 대분류의 세부 분류끼리)의 순서를 바꾼다. */
function withOrder(tree: CategoryTreeDto[], orderedIds: readonly string[]): CategoryTreeDto[] {
  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  const sortSiblings = (nodes: CategoryNodeDto[]) => (nodes.some((node) => rank.has(node.id))
    ? [...nodes].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
    : nodes);

  return tree.map((group) => ({
    ...group,
    categories: sortSiblings(group.categories).map((parent) => ({ ...parent, children: sortSiblings(parent.children) })),
  }));
}

export default function CategoryBoard() {
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [formTarget, setFormTarget] = useState<CategoryFormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryNodeDto | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.CATEGORY.TREE({ kind }),
    queryFn: () => getCategoryTree({ kind }),
  });

  const groups = data?.[0]?.categories ?? [];
  const treeKey = QUERY_KEY.CATEGORY.TREE({ kind });

  // 누르는 즉시 순서를 바꿔 보이고, 실패하면 되돌린다.
  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCategories({ orderedIds }),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: treeKey });
      const snapshot = queryClient.getQueryData<CategoryTreeDto[]>(treeKey);
      queryClient.setQueryData<CategoryTreeDto[]>(treeKey, (tree) => (tree ? withOrder(tree, orderedIds) : tree));

      return { snapshot };
    },
    onError: (error, _ids, context) => {
      queryClient.setQueryData(treeKey, context?.snapshot);
      toast.error(isApiError(error) ? error.message : '순서를 바꾸지 못했어요.');
    },
    // 거래 입력 창의 분류 순서도 같은 캐시를 보므로 함께 새로 받는다.
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY.CATEGORY.ALL }),
  });

  const move = (category: CategoryNodeDto, offset: MoveOffset) => {
    const siblings = category.parentId
      ? groups.find((parent) => parent.id === category.parentId)?.children ?? []
      : groups;
    const ids = siblings.map((sibling) => sibling.id);
    const from = ids.indexOf(category.id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= ids.length) return;

    [ids[from], ids[to]] = [ids[to] as string, ids[from] as string];
    reorder.mutate(ids);
  };

  const refresh = () => {
    setFormTarget(null);
    setDeleteTarget(null);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CATEGORY.ALL });
  };

  return (
    <>
      <Card
        title="분류"
        icon="🏷️"
        description="큰 분류 아래에 세부 분류를 만들어요. 거래는 세부 분류로 적어요."
        action={
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<Icon
              name="plus"
              size={15}
            />}
            onClick={() => setFormTarget({ mode: 'create-parent' })}
          >
            큰 분류 추가
          </Button>
        }
      >
        <div className={styles.categoryboard}>
          <SegmentedControl
            name="category-kind"
            options={KIND_OPTIONS}
            value={kind}
            onChange={(value) => setKind(value as CategoryKind)}
            ariaLabel="분류 종류"
          />
          <p className={styles.categoryboard__hint}>{KIND_HINT[kind]}</p>

          {isPending ? (
            <SkeletonRows
              count={4}
              isPadded={false}
            />
          ) : groups.length === 0 ? (
            <EmptyState
              title="분류가 없어요"
              description="큰 분류부터 만들어 주세요."
              action={
                <Button
                  size="sm"
                  onClick={() => setFormTarget({ mode: 'create-parent' })}
                >
                  큰 분류 추가
                </Button>
              }
            />
          ) : (
            <ul className={styles.categoryboard__groups}>
              {groups.map((parent, index) => (
                <CategoryGroup
                  key={parent.id}
                  parent={parent}
                  isFirst={index === 0}
                  isLast={index === groups.length - 1}
                  isReordering={reorder.isPending}
                  onAddChild={(target) => setFormTarget({ mode: 'create-child', parent: target })}
                  onEdit={(category) => setFormTarget({ mode: 'edit', category })}
                  onDelete={setDeleteTarget}
                  onMove={move}
                />
              ))}
            </ul>
          )}
        </div>
      </Card>

      <CategoryFormModal
        key={categoryFormKey(formTarget)}
        target={formTarget}
        kind={kind}
        onClose={() => setFormTarget(null)}
        onSaved={refresh}
      />

      <CategoryDeleteModal
        key={`delete:${deleteTarget?.id ?? 'none'}`}
        category={deleteTarget}
        groups={groups}
        onClose={() => setDeleteTarget(null)}
        onDone={refresh}
      />
    </>
  );
}
