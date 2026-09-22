'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import SegmentedControl from '@/components/common/SegmentedControl';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { deleteCategory, getCategoryTree } from '@/service/category';
import { isApiError } from '@/interface/errorType';
import { cn } from '@/utils/ts/cn';
import type { CategoryKind } from '@/generated/prisma/enums';
import type { CategoryNodeDto } from '@/service/category/type';
import CategoryFormModal from '../CategoryFormModal';
import CategoryMergeModal from '../CategoryMergeModal';
import styles from './CategoryBoard.module.scss';

const KIND_OPTIONS = [
  { value: 'EXPENSE', label: '지출' },
  { value: 'INCOME', label: '수입' },
  { value: 'TRANSFER', label: '이체' },
] as const;

const KIND_HINT: Record<CategoryKind, string> = {
  EXPENSE: '쓴 돈을 담는 분류입니다.',
  INCOME: '들어온 돈을 담는 분류입니다.',
  TRANSFER: '계좌 이동·카드대금 납부·저축처럼 수입도 지출도 아닌 돈입니다. 집계에서 빠집니다.',
};

type FormTarget =
  | { mode: 'create-parent' }
  | { mode: 'create-child'; parent: CategoryNodeDto }
  | { mode: 'edit'; category: CategoryNodeDto };

/** 폼 모달을 대상마다 새로 마운트하기 위한 키. 앞서 열었던 값이 남지 않는다. */
function formTargetKey(target: FormTarget | null): string {
  if (!target) return 'form:none';
  if (target.mode === 'create-parent') return 'create-parent';
  if (target.mode === 'create-child') return `create-child:${target.parent.id}`;

  return `edit:${target.category.id}`;
}

export default function CategoryBoard() {
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [mergeTarget, setMergeTarget] = useState<CategoryNodeDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryNodeDto | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.CATEGORY.TREE({ kind }),
    queryFn: () => getCategoryTree({ kind }),
  });

  const removal = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success('카테고리를 삭제했습니다.');
      setDeleteTarget(null);
    },
    onError: (error) => {
      // 거래가 남아 있으면 '옮기고 삭제'로 넘긴다 — 막다른 길로 두지 않는다.
      if (isApiError(error) && error.code === 'CONFLICT' && deleteTarget) {
        setDeleteTarget(null);
        setMergeTarget(deleteTarget);
        toast.info(error.message);

        return;
      }
      toast.error(isApiError(error) ? error.message : '삭제하지 못했습니다.');
    },
  });

  const groups = data?.[0]?.categories ?? [];

  return (
    <>
      <Card
        title="카테고리"
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
            대분류 추가
          </Button>
        }
      >
        <div className={styles.categoryboard}>
          <SegmentedControl
            name="category-kind"
            options={KIND_OPTIONS}
            value={kind}
            onChange={(value) => setKind(value as CategoryKind)}
            ariaLabel="카테고리 종류"
          />
          <p className={styles.categoryboard__hint}>{KIND_HINT[kind]}</p>

          {isPending ? (
            <div className={styles.categoryboard__loading}>
              <Skeleton height={64} />
              <Skeleton height={64} />
              <Skeleton height={64} />
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              title="카테고리가 없습니다"
              description="대분류를 먼저 만들고 그 아래 소분류를 더하세요."
              action={
                <Button
                  size="sm"
                  onClick={() => setFormTarget({ mode: 'create-parent' })}
                >
                  대분류 추가
                </Button>
              }
            />
          ) : (
            <ul className={styles.categoryboard__groups}>
              {groups.map((parent) => (
                <li
                  key={parent.id}
                  className={styles.categoryboard__group}
                >
                  <div className={styles.categoryboard__grouphead}>
                    <span className={styles.categoryboard__groupname}>{parent.name}</span>
                    {parent.defaultSplitMode === 'PERSONAL' && <Badge tone="neutral">개인</Badge>}
                    <span className={styles.categoryboard__count}>{parent.transactionCount}건</span>

                    <div className={styles.categoryboard__groupactions}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormTarget({ mode: 'create-child', parent })}
                      >
                        소분류 추가
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormTarget({ mode: 'edit', category: parent })}
                      >
                        수정
                      </Button>
                    </div>
                  </div>

                  <ul className={styles.categoryboard__children}>
                    {parent.children.map((child) => (
                      <li
                        key={child.id}
                        className={styles.categoryboard__child}
                      >
                        <button
                          type="button"
                          className={styles.categoryboard__childname}
                          onClick={() => setFormTarget({ mode: 'edit', category: child })}
                        >
                          {child.name}
                        </button>
                        <span className={cn(styles.categoryboard__count, styles['categoryboard__count--child'])}>
                          {child.transactionCount}건
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => (child.transactionCount > 0 ? setMergeTarget(child) : setDeleteTarget(child))}
                        >
                          {child.transactionCount > 0 ? '옮기기' : '삭제'}
                        </Button>
                      </li>
                    ))}
                    {parent.children.length === 0 && (
                      <li className={styles.categoryboard__nochild}>소분류가 없습니다. 거래는 소분류에만 달립니다.</li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <CategoryFormModal
        key={formTargetKey(formTarget)}
        target={formTarget}
        kind={kind}
        onClose={() => setFormTarget(null)}
        onSaved={() => {
          setFormTarget(null);
          void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CATEGORY.ALL });
        }}
      />

      <CategoryMergeModal
        key={`merge:${mergeTarget?.id ?? 'none'}`}
        category={mergeTarget}
        candidates={groups}
        onClose={() => setMergeTarget(null)}
        onMerged={() => {
          setMergeTarget(null);
          void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CATEGORY.ALL });
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removal.mutate(deleteTarget.id)}
        title={`'${deleteTarget?.name ?? ''}' 삭제`}
        description="되돌릴 수 없습니다. 거래가 달려 있으면 삭제되지 않고 옮기기로 넘어갑니다."
        confirmLabel="삭제"
        isDestructive
        isLoading={removal.isPending}
      />
    </>
  );
}
