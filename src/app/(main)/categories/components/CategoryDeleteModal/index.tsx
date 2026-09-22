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
  category: CategoryNodeDto | null;
  /** 옮길 곳을 고르기 위한 같은 종류의 전체 트리. */
  groups: readonly CategoryNodeDto[];
  onClose: () => void;
  onDone: () => void;
}

/**
 * 분류 삭제.
 *
 * 거래가 없으면 그냥 지우고, 있으면 **어디로 옮길지 먼저 고르게 한다.**
 * 목록에는 버튼을 '삭제' 하나만 두고 이 복잡함은 누른 뒤에만 보여준다 —
 * 목록에서 '옮기기'와 '삭제'를 갈라 두면 둘이 뭐가 다른지 알 수 없다.
 */
export default function CategoryDeleteModal({ category, groups, onClose, onDone }: CategoryDeleteModalProps) {
  const [targetId, setTargetId] = useState('');
  const count = category?.transactionCount ?? 0;
  const hasTransactions = count > 0;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!category) return;
      if (hasTransactions) {
        await mergeCategory(category.id, { intoCategoryId: targetId });

        return;
      }
      await deleteCategory(category.id);
    },
  });

  const options = groups
    .map((parent) => ({
      label: parent.name,
      options: parent.children
        .filter((child) => child.id !== category?.id)
        .map((child) => ({ value: child.id, label: child.name })),
    }))
    .filter((group) => group.options.length > 0);

  const onConfirm = async () => {
    if (hasTransactions && !targetId) {
      toast.info('옮길 곳을 골라 주세요.');

      return;
    }

    try {
      await mutateAsync();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : '지우지 못했습니다.');

      return;
    }

    toast.success(hasTransactions ? `거래 ${count}건을 옮기고 지웠습니다.` : '지웠습니다.');
    onDone();
  };

  return (
    <Modal
      isOpen={Boolean(category)}
      onClose={onClose}
      title={`'${category?.name ?? ''}' 지우기`}
      description={
        hasTransactions
          ? `이 분류에 거래가 ${count}건 있습니다. 거래를 지우지 않고 다른 분류로 옮긴 뒤 이 분류를 없앱니다.`
          : '이 분류를 없앱니다. 되돌릴 수 없습니다.'
      }
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
          >
            {hasTransactions ? '옮기고 지우기' : '지우기'}
          </Button>
        </div>
      }
    >
      {hasTransactions && (
        <FormField
          label="거래를 옮길 곳"
          hint="지난달 통계도 옮긴 분류로 함께 계산됩니다."
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
