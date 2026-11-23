'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Icon from '@/components/common/Icon';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import Skeleton from '@/components/common/Skeleton';
import { useExcelDownload } from '@/hooks/useExcelDownload';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getResetSummary, resetHouseholdData } from '@/service/household';
import { RESET_CONFIRM_TEXT } from '@/service/household/schema';
import styles from './ResetModal.module.scss';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResetModal({ isOpen, onClose }: ResetModalProps) {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState('');
  const excel = useExcelDownload();

  // 창을 열 때마다 새로 센다. 다른 사람이 방금 적은 거래도 건수에 들어가야 한다.
  const summary = useQuery({
    queryKey: QUERY_KEY.HOUSEHOLD.RESET_SUMMARY(),
    queryFn: getResetSummary,
    enabled: isOpen,
    staleTime: 0,
  });

  const reset = useMutation({
    mutationFn: () => resetHouseholdData({ confirm: RESET_CONFIRM_TEXT }),
    onSuccess: (deleted) => {
      toast.success(
        `초기화했어요. 거래 ${deleted.transactions.toLocaleString('ko-KR')}건, 자산 ${deleted.assets}개, `
        + `대출 ${deleted.loans}개, 반복 거래 ${deleted.recurringRules}개를 지웠어요.`,
      );
      // 대시보드·거래·자산·예산 등 모든 화면의 숫자가 바뀌므로 캐시를 전부 다시 받는다.
      void queryClient.invalidateQueries();
      onClose();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '초기화하지 못했어요.'),
  });

  const counts = summary.data;
  const isConfirmed = typed.trim() === RESET_CONFIRM_TEXT;
  const items = [
    { label: '거래', value: counts ? `${counts.transactions.toLocaleString('ko-KR')}건` : null },
    { label: '자산', value: counts ? `${counts.assets}개` : null },
    { label: '대출', value: counts ? `${counts.loans}개` : null },
    { label: '반복 거래', value: counts ? `${counts.recurringRules}개` : null },
  ];

  return (
    <Modal
      urlKey="data-reset"
      isOpen={isOpen}
      onClose={onClose}
      title="거래와 자산을 모두 지울까요?"
      description="장부를 함께 쓰는 모든 사람의 데이터가 지워지고, 되돌릴 수 없어요."
      footer={
        <div className={styles.resetmodal__actions}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            variant="danger"
            disabled={!isConfirmed || !counts}
            isLoading={reset.isPending}
            onClick={() => reset.mutate()}
          >
            모두 지우기
          </Button>
        </div>
      }
    >
      <div className={styles.resetmodal}>
        <dl
          className={styles.resetmodal__counts}
          aria-busy={summary.isPending}
        >
          {items.map((item) => (
            <div
              key={item.label}
              className={styles.resetmodal__count}
            >
              <dt>{item.label}</dt>
              <dd>
                {item.value ?? <Skeleton
                  width={56}
                  height={20}
                />}
              </dd>
            </div>
          ))}
        </dl>

        <p className={styles.resetmodal__note}>분류·결제수단·예산·구성원은 그대로 남아요.</p>

        {counts?.firstDate && counts.lastDate && (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Icon
              name="download"
              size={15}
            />}
            isLoading={excel.isPending}
            onClick={() => excel.mutate({
              from: counts.firstDate as string,
              to: counts.lastDate as string,
              sheets: ['summary', 'detail', 'pivot'],
            })}
          >
            지우기 전에 거래 엑셀로 내려받기
          </Button>
        )}

        <FormField label={`확인을 위해 '${RESET_CONFIRM_TEXT}'를 입력해 주세요`}>
          {({ id }) => (
            <Input
              id={id}
              value={typed}
              placeholder={RESET_CONFIRM_TEXT}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          )}
        </FormField>
      </div>
    </Modal>
  );
}
