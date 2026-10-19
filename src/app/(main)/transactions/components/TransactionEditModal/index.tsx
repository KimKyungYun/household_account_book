'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Modal from '@/components/common/Modal';
import TransactionForm, { useIsTransactionFormSaving } from '@/components/transaction/TransactionForm';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { deleteTransaction } from '@/service/transaction';
import type { TransactionListDto, TransactionListItemDto } from '@/service/transaction/type';
import styles from './TransactionEditModal.module.scss';

const EDIT_FORM_ID = 'transaction-edit-form';

/** 목록 캐시에서 한 건을 빼고 합계를 맞춘다. 서버 응답을 기다리지 않고 지운 것처럼 보이게 한다. */
function withoutTransaction(list: TransactionListDto, id: string): TransactionListDto {
  const target = list.items.find((item) => item.id === id);
  if (!target) return list;

  const incomeTotal = list.summary.incomeTotal - (target.type === 'INCOME' ? target.amount : 0);
  const expenseTotal = list.summary.expenseTotal - (target.type === 'EXPENSE' ? target.amount : 0);

  return {
    ...list,
    items: list.items.filter((item) => item.id !== id),
    summary: {
      ...list.summary,
      incomeTotal,
      expenseTotal,
      transferTotal: list.summary.transferTotal - (target.type === 'TRANSFER' ? target.amount : 0),
      net: incomeTotal - expenseTotal,
      count: list.summary.count - 1,
    },
  };
}

interface TransactionEditModalProps {
  /** 고칠 거래. null 이면 닫혀 있다. */
  transaction: TransactionListItemDto | null;
  onClose: () => void;
}

/** 거래 수정 창과 그 위에 겹쳐 뜨는 삭제 확인. 거래 내역 탭과 반복 거래 탭이 함께 쓴다. */
export default function TransactionEditModal({ transaction, onClose }: TransactionEditModalProps) {
  const [deleteTarget, setDeleteTarget] = useState<TransactionListItemDto | null>(null);
  const queryClient = useQueryClient();
  const isSaving = useIsTransactionFormSaving(EDIT_FORM_ID);

  // 지우는 즉시 모든 목록(거래 내역·반복 거래)에서 뺀다. 실패하면 되돌리고 알린다.
  const removal = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onMutate: async (id) => {
      setDeleteTarget(null);
      onClose();

      const listKey = [...QUERY_KEY.TRANSACTION.ALL, 'list'];
      await queryClient.cancelQueries({ queryKey: listKey });
      const snapshots = queryClient.getQueriesData<TransactionListDto>({ queryKey: listKey });
      queryClient.setQueriesData<TransactionListDto>(
        { queryKey: listKey },
        (list) => (list ? withoutTransaction(list, id) : list),
      );

      return { snapshots };
    },
    onSuccess: () => toast.success('삭제했어요.'),
    onError: (error, _id, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) queryClient.setQueryData(key, snapshot);
      toast.error(isApiError(error) ? error.message : '삭제하지 못했어요.');
    },
  });

  return (
    <>
      {/* 600px 이하에서는 Modal 이 스스로 바텀시트가 된다. */}
      <Modal
        urlKey="transaction-edit"
        key={transaction?.id ?? 'none'}
        isOpen={Boolean(transaction)}
        onClose={onClose}
        title="거래 수정"
        footer={
          <div className={styles.transactioneditmodal__actions}>
            <Button
              variant="danger"
              onClick={() => transaction && setDeleteTarget(transaction)}
            >
              삭제
            </Button>
            <span className={styles.transactioneditmodal__spacer} />
            <Button
              variant="secondary"
              onClick={onClose}
            >
              닫기
            </Button>
            <Button
              type="submit"
              form={EDIT_FORM_ID}
              isLoading={isSaving}
            >
              저장
            </Button>
          </div>
        }
      >
        {transaction && (
          <TransactionForm
            mode="edit"
            transaction={transaction}
            formId={EDIT_FORM_ID}
            onSuccess={() => {
              void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
              onClose();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        urlKey="transaction-delete"
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removal.mutate(deleteTarget.id)}
        title="거래 삭제"
        description="되돌릴 수 없어요. 이번 달 합계도 함께 바뀌어요."
        confirmLabel="삭제"
        isDestructive
        isLoading={removal.isPending}
      />
    </>
  );
}
