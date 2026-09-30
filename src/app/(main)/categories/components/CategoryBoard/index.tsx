'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import SegmentedControl from '@/components/common/SegmentedControl';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryTree } from '@/service/category';
import type { CategoryKind } from '@/generated/prisma/enums';
import type { CategoryNodeDto } from '@/service/category/type';
import CategoryDeleteModal from '../CategoryDeleteModal';
import CategoryFormModal from '../CategoryFormModal';
import styles from './CategoryBoard.module.scss';

const KIND_OPTIONS = [
  { value: 'EXPENSE', label: '쓴 돈' },
  { value: 'INCOME', label: '번 돈' },
  { value: 'TRANSFER', label: '옮긴 돈' },
] as const;

const KIND_HINT: Record<CategoryKind, string> = {
  EXPENSE: '나간 금액을 기록하는 분류입니다.',
  INCOME: '들어온 금액을 기록하는 분류입니다. 급여, 상여 등.',
  TRANSFER:
    '계좌끼리 옮긴 금액, 카드값, 적금 납입액입니다. 쓴 것도 번 것도 아니므로 모든 합계에서 제외됩니다.',
};

type FormTarget =
  | { mode: 'create-parent' }
  | { mode: 'create-child'; parent: CategoryNodeDto }
  | { mode: 'edit'; category: CategoryNodeDto };

/** 폼을 대상마다 새로 마운트하기 위한 키. 앞서 열었던 값이 남지 않는다. */
function formTargetKey(target: FormTarget | null): string {
  if (!target) return 'form:none';
  if (target.mode === 'create-parent') return 'create-parent';
  if (target.mode === 'create-child') return `create-child:${target.parent.id}`;

  return `edit:${target.category.id}`;
}

export default function CategoryBoard() {
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryNodeDto | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.CATEGORY.TREE({ kind }),
    queryFn: () => getCategoryTree({ kind }),
  });

  const groups = data?.[0]?.categories ?? [];
  const refresh = () => {
    setFormTarget(null);
    setDeleteTarget(null);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CATEGORY.ALL });
  };

  return (
    <>
      <Card
        title="분류"
        description="큰 분류 아래에 세부 분류를 만듭니다. 거래는 세부 분류에만 등록됩니다."
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
            <div className={styles.categoryboard__loading}>
              <Skeleton height={72} />
              <Skeleton height={72} />
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              title="분류가 없습니다"
              description="큰 분류를 먼저 만드세요."
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
              {groups.map((parent) => (
                <li
                  key={parent.id}
                  className={styles.categoryboard__group}
                >
                  <div className={styles.categoryboard__grouphead}>
                    <span
                      className={styles.categoryboard__color}
                      style={parent.colorHex ? { backgroundColor: parent.colorHex } : undefined}
                      aria-hidden="true"
                    />
                    <span className={styles.categoryboard__groupname}>{parent.name}</span>
                    {parent.defaultSplitMode === 'PERSONAL' && <Badge tone="neutral">각자 돈</Badge>}
                    <span className={styles.categoryboard__count}>거래 {parent.transactionCount}건</span>

                    <div className={styles.categoryboard__groupactions}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormTarget({ mode: 'create-child', parent })}
                      >
                        세부 분류 추가
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setFormTarget({ mode: 'edit', category: parent })}
                      >
                        이름 바꾸기
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
                          title="이름 바꾸기"
                        >
                          {child.name}
                        </button>
                        <span className={styles.categoryboard__childcount}>
                          {child.transactionCount === 0 ? '' : `${child.transactionCount}건`}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(child)}
                        >
                          지우기
                        </Button>
                      </li>
                    ))}
                    {parent.children.length === 0 && (
                      <li className={styles.categoryboard__nochild}>
                        세부 분류가 없어 이 분류로는 거래를 등록할 수 없습니다.
                      </li>
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
