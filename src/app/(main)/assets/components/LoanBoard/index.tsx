'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Amount from '@/components/common/Amount';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import ProgressBar from '@/components/common/ProgressBar';
import { SkeletonRows } from '@/components/common/Skeleton';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { deleteLoan, getLoans } from '@/service/loan';
import { formatDateLabel } from '@/utils/ts/formatDate';
import type { LoanDto } from '@/service/loan/type';
import LoanFormModal from '../LoanFormModal';
import LoanScheduleModal from '../LoanScheduleModal';
import styles from './LoanBoard.module.scss';

const KIND_LABEL: Record<LoanDto['kind'], string> = {
  MORTGAGE: '주택담보',
  JEONSE: '전세자금',
  CREDIT: '신용',
  CAR: '자동차',
  STUDENT: '학자금',
  OTHER: '기타',
};

const REPAYMENT_LABEL: Record<LoanDto['repaymentType'], string> = {
  EQUAL_PAYMENT: '원리금균등',
  EQUAL_PRINCIPAL: '원금균등',
  INTEREST_ONLY: '만기일시',
};

/** 425 → '4.25%'. 끝자리 0 은 떼어 4.5% / 4% 로 읽히게 한다. */
export function formatRate(annualRateBp: number): string {
  return `${(annualRateBp / 100).toFixed(2).replace(/\.?0+$/, '')}%`;
}

export default function LoanBoard() {
  const [editing, setEditing] = useState<LoanDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LoanDto | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<LoanDto | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({ queryKey: QUERY_KEY.LOAN.LIST(), queryFn: getLoans });

  const removal = useMutation({
    mutationFn: (id: string) => deleteLoan(id),
    onSuccess: ({ keptTransactionCount }) => {
      toast.success(
        keptTransactionCount > 0
          ? `지웠습니다. 이미 갚은 ${keptTransactionCount}건의 기록은 거래에 그대로 남아 있습니다.`
          : '지웠습니다.',
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY.LOAN.ALL });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '지우지 못했습니다.'),
  });

  if (isPending) {
    return (
      <Card
        title="대출"
        description="상환일마다 이자는 지출로, 원금은 이체로 나뉘어 기록됩니다."
        isFlush
      >
        <SkeletonRows count={2} />
      </Card>
    );
  }

  const loans = data?.loans ?? [];
  const active = loans.filter((loan) => loan.isActive);
  const archived = loans.filter((loan) => !loan.isActive);

  return (
    <>
      <Card
        title="대출"
        description={
          active.length > 0
            ? `남은 원금 ${(data?.totalOutstandingAll ?? 0).toLocaleString('ko-KR')}원. 상환일마다 이자는 지출로, 원금은 이체로 나뉘어 기록됩니다.`
            : '조건을 넣어 두면 매달 상환일에 이자와 원금이 자동으로 기록됩니다. 이자는 지출로, 원금은 이체로 나뉘어 들어갑니다.'
        }
        action={
          <Button
            size="sm"
            iconLeft={<Icon
              name="plus"
              size={16}
            />}
            onClick={() => setIsCreating(true)}
          >
            대출 추가
          </Button>
        }
        isFlush
      >
        {active.length === 0 ? (
          <EmptyState
            title="등록한 대출이 없습니다"
            description="원금·금리·기간을 한 번 넣어 두면 매달 갚는 금액을 따로 적지 않아도 됩니다."
          />
        ) : (
          <ul className={styles.loanboard__list}>
            {active.map((loan) => (
              <li
                key={loan.id}
                className={styles.loanboard__item}
              >
                <button
                  type="button"
                  className={styles.loanboard__row}
                  style={{ borderInlineStartColor: loan.colorHex ?? 'var(--member-b)' }}
                  onClick={() => setEditing(loan)}
                >
                  <span className={styles.loanboard__main}>
                    <span className={styles.loanboard__name}>
                      {loan.name}
                      <Badge tone="neutral">{KIND_LABEL[loan.kind]}</Badge>
                      <Badge tone="neutral">{formatRate(loan.annualRateBp)}</Badge>
                      {!loan.includeInNetWorth && <Badge tone="neutral">순자산 제외</Badge>}
                    </span>

                    <span className={styles.loanboard__meta}>
                      {REPAYMENT_LABEL[loan.repaymentType]} · {loan.member.displayName}
                      {loan.nextPayment
                        ? ` · 다음 ${formatDateLabel(loan.nextPayment.dueDate)}`
                        : ' · 다 갚았습니다'}
                    </span>

                    <span className={styles.loanboard__progress}>
                      <ProgressBar
                        ratio={loan.progress}
                        ariaLabel={`${loan.name} 상환 진행률`}
                      />
                      <span className={styles.loanboard__progresstext}>
                        {loan.paidInstallments}/{loan.termMonths}회 ·{' '}
                        {Math.round(loan.progress * 100)}% 갚음
                      </span>
                    </span>
                  </span>

                  <span className={styles.loanboard__amounts}>
                    <Amount
                      value={loan.outstanding}
                      tone="expense"
                      size="medium"
                    />
                    <span className={styles.loanboard__sub}>
                      {loan.nextPayment
                        ? `매달 ${(
                          loan.nextPayment.principalAmount + loan.nextPayment.interestAmount
                        ).toLocaleString('ko-KR')}원`
                        : '상환 완료'}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.loanboard__schedule}
                  onClick={() => setScheduleTarget(loan)}
                >
                  상환 계획 보기
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {archived.length > 0 && (
        <Card
          title="보관한 대출"
          description="목록에서 숨긴 대출입니다. 눌러서 다시 꺼낼 수 있습니다."
          isFlush
        >
          <ul className={styles.loanboard__list}>
            {archived.map((loan) => (
              <li key={loan.id}>
                <button
                  type="button"
                  className={styles.loanboard__row}
                  data-archived="true"
                  onClick={() => setEditing(loan)}
                >
                  <span className={styles.loanboard__main}>
                    <span className={styles.loanboard__name}>{loan.name}</span>
                  </span>
                  <Amount
                    value={loan.outstanding}
                    tone="neutral"
                    size="small"
                  />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(isCreating || editing) && (
        <LoanFormModal
          key={editing ? `edit:${editing.id}` : 'create'}
          isOpen
          loan={editing}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
          onDelete={(loan) => {
            setEditing(null);
            setDeleteTarget(loan);
          }}
          onSaved={() => {
            setIsCreating(false);
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.LOAN.ALL });
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.STATS.ALL });
          }}
        />
      )}

      {scheduleTarget && (
        <LoanScheduleModal
          isOpen
          loan={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          isOpen
          title={`'${deleteTarget.name}' 을 지울까요?`}
          description="대출만 사라집니다. 이미 갚은 기록은 거래에 그대로 남습니다. 다 갚은 대출이라면 지우는 대신 '보관'해 두면 기록과 함께 남습니다."
          confirmLabel="지우기"
          isDestructive
          isLoading={removal.isPending}
          onConfirm={() => removal.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
