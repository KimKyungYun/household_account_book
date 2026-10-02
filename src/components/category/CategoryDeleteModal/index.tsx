'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Modal from '@/components/common/Modal';
import Select from '@/components/common/Select';
import { isApiError } from '@/interface/errorType';
import { deleteCategory, mergeCategory } from '@/service/category';
import type { CategoryNodeDto } from '@/service/category/type';
import styles from './CategoryDeleteModal.module.scss';

interface CategoryDeleteModalProps {
  /** 지울 분류. 대분류면 딸린 세부 분류까지 함께 지운다. */
  category: CategoryNodeDto | null;
  /** 옮길 곳을 고르기 위한 같은 종류의 전체 트리. */
  groups: readonly CategoryNodeDto[];
  onClose: () => void;
  onDone: () => void;
}

/** '거래 3건, 반복 거래 1개, 대출 1개' — 쓰이는 곳만 골라 적는다. */
function usageTextOf(category: CategoryNodeDto): string {
  return [
    category.transactionCount > 0 ? `거래 ${category.transactionCount}건` : null,
    category.recurringCount > 0 ? `반복 거래 ${category.recurringCount}개` : null,
    category.loanCount > 0 ? `대출 ${category.loanCount}개` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

function descriptionOf(category: CategoryNodeDto | null, usage: string, canMove: boolean): string {
  if (!category) return '';

  const isParent = category.level === 1;
  const what = isParent && category.children.length > 0
    ? `'${category.name}' 분류와 세부 분류 ${category.children.length}개를`
    : '이 분류를';

  if (!usage) return `${what} 없앨게요. 되돌릴 수 없어요.`;
  if (!canMove) return `${usage}에서 이 분류를 쓰고 있어요. 옮길 세부 분류가 없으니 다른 분류를 먼저 만들어 주세요.`;

  return `${usage}에서 이 분류를 쓰고 있어요. 다른 분류로 옮기고 ${what} 없앨게요.`;
}

/**
 * 분류 삭제. 처음부터 있던 분류도 직접 만든 분류와 똑같이 지울 수 있다.
 *
 * 쓰는 곳(거래·반복 거래·대출)이 없으면 그냥 지우고, 있으면 **어디로 옮길지 먼저 고르게 한다.**
 * 목록에는 버튼을 '지우기' 하나만 두고 이 복잡함은 누른 뒤에만 보여준다 —
 * 목록에서 '옮기기'와 '삭제'를 갈라 두면 둘이 뭐가 다른지 알 수 없다.
 */
export default function CategoryDeleteModal({ category, groups, onClose, onDone }: CategoryDeleteModalProps) {
  const [targetId, setTargetId] = useState('');
  const usage = category ? usageTextOf(category) : '';
  const isInUse = usage !== '';

  // 지우는 분류 자신과, 대분류면 그 밑의 세부 분류는 옮길 곳이 될 수 없다.
  const removedIds = new Set([category?.id, ...(category?.children ?? []).map((child) => child.id)]);
  const options = groups
    .filter((parent) => !removedIds.has(parent.id))
    .map((parent) => ({
      label: parent.name,
      options: parent.children
        .filter((child) => !removedIds.has(child.id))
        .map((child) => ({ value: child.id, label: child.name })),
    }))
    .filter((group) => group.options.length > 0);
  const canMove = options.length > 0;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!category) return;
      if (isInUse) {
        await mergeCategory(category.id, { intoCategoryId: targetId });

        return;
      }
      await deleteCategory(category.id);
    },
  });

  const onConfirm = async () => {
    if (isInUse && !targetId) {
      toast.info('옮길 곳을 골라 주세요.');

      return;
    }

    try {
      await mutateAsync();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : '지우지 못했어요.');

      return;
    }

    toast.success(isInUse ? '옮기고 지웠어요.' : '지웠어요.');
    onDone();
  };

  return (
    <Modal
      urlKey="category-delete"
      isOpen={Boolean(category)}
      onClose={onClose}
      title={`'${category?.name ?? ''}' 지우기`}
      description={descriptionOf(category, usage, canMove)}
      footer={
        <div className={styles.categorydeletemodal__actions}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isInUse && !canMove}
          >
            {isInUse ? '옮기고 지우기' : '지우기'}
          </Button>
        </div>
      }
    >
      {isInUse && canMove && (
        <FormField
          label="옮길 곳"
          hint="지난달 통계와 반복 거래·대출도 옮긴 분류로 이어져요."
          isRequired
        >
          {({ id }) => (
            <Select
              id={id}
              options={[]}
              groups={options}
              placeholder="분류 고르기"
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            />
          )}
        </FormField>
      )}
    </Modal>
  );
}
