'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Modal from '@/components/common/Modal';
import Select from '@/components/common/Select';
import { mergeCategory } from '@/service/category';
import { isApiError } from '@/interface/errorType';
import type { CategoryNodeDto } from '@/service/category/type';
import styles from './CategoryMergeModal.module.scss';

interface CategoryMergeModalProps {
  category: CategoryNodeDto | null;
  /** 옮길 후보를 고르기 위한 전체 트리. 같은 종류의 소분류만 대상이 된다. */
  candidates: readonly CategoryNodeDto[];
  onClose: () => void;
  onMerged: () => void;
}

/**
 * 거래가 달린 카테고리를 정리하는 유일한 길.
 * 그냥 삭제하면 과거 집계가 사라지므로, 어디로 옮길지 먼저 정하게 한다.
 *
 * 고른 값은 부모가 `key`(대상 id)로 다시 마운트해 초기화한다 —
 * effect 로 되돌리면 렌더가 한 번 더 돌고, 대상이 바뀌는 순간 옛 값이 잠깐 보인다.
 */
export default function CategoryMergeModal({ category, candidates, onClose, onMerged }: CategoryMergeModalProps) {
  const [targetId, setTargetId] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => mergeCategory(category?.id ?? '', { intoCategoryId: targetId }),
  });

  const groups = candidates.map((parent) => ({
    label: parent.name,
    options: parent.children
      .filter((child) => child.id !== category?.id)
      .map((child) => ({ value: child.id, label: child.name })),
  })).filter((group) => group.options.length > 0);

  const onConfirm = async () => {
    if (!targetId) {
      toast.info('옮길 카테고리를 골라 주세요.');

      return;
    }

    try {
      await mutateAsync();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : '옮기지 못했습니다.');

      return;
    }

    toast.success('거래를 옮기고 정리했습니다.');
    onMerged();
  };

  return (
    <Modal
      isOpen={Boolean(category)}
      onClose={onClose}
      title={`'${category?.name ?? ''}' 정리`}
      description={`이 카테고리의 거래 ${category?.transactionCount ?? 0}건을 다른 소분류로 옮깁니다. 과거 집계도 옮긴 쪽으로 잡힙니다.`}
      footer={
        <div className={styles.categorymergemodal__actions}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isPending}
          >
            옮기고 정리
          </Button>
        </div>
      }
    >
      <FormField
        label="옮길 소분류"
        isRequired
      >
        {({ id }) => (
          <Select
            id={id}
            options={[]}
            groups={groups}
            placeholder="소분류 고르기"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
