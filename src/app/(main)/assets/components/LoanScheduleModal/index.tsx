'use client';

import { useQuery } from '@tanstack/react-query';
import Modal from '@/components/common/Modal';
import { SkeletonRows } from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getLoanSchedule } from '@/service/loan';
import { todayInSeoul } from '@/utils/ts/formatDate';
import type { LoanDto } from '@/service/loan/type';
import styles from './LoanScheduleModal.module.scss';

interface LoanScheduleModalProps {
  isOpen: boolean;
  loan: LoanDto;
  onClose: () => void;
}

/**
 * 만기까지의 상환 계획.
 *
 * 360 회차가 그대로 오므로 `Table` 대신 가벼운 목록으로 그린다. 표 컴포넌트는 열 계산을
 * 행마다 하기 때문에 이 길이에서 스크롤이 눈에 띄게 끊긴다.
 */
export default function LoanScheduleModal({ isOpen, loan, onClose }: LoanScheduleModalProps) {
  const today = todayInSeoul();
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.LOAN.SCHEDULE(loan.id),
    queryFn: () => getLoanSchedule(loan.id),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${loan.name} 상환 계획`}
      description="회차마다 원금과 이자를 얼마씩 갚는지 보여 드려요."
      size="lg"
    >
      {isPending ? (
        <SkeletonRows
          count={6}
          isPadded={false}
        />
      ) : (
        <div className={styles.loanschedulemodal}>
          <div
            className={styles.loanschedulemodal__head}
            role="row"
          >
            <span role="columnheader">회차</span>
            <span role="columnheader">상환일</span>
            <span role="columnheader">원금</span>
            <span role="columnheader">이자</span>
            <span role="columnheader">남은 원금</span>
          </div>

          <ul className={styles.loanschedulemodal__list}>
            {(data ?? []).map((row) => (
              <li
                key={row.installmentNo}
                className={styles.loanschedulemodal__row}
                data-paid={row.paid ? 'true' : undefined}
                data-next={!row.paid && row.dueDate >= today ? 'true' : undefined}
              >
                <span>{row.installmentNo}</span>
                <span>{row.dueDate}</span>
                <span>{row.principalAmount.toLocaleString('ko-KR')}</span>
                <span>{row.interestAmount.toLocaleString('ko-KR')}</span>
                <span>{row.balanceAfter.toLocaleString('ko-KR')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
