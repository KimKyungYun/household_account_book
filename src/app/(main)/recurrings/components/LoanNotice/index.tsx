'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Card from '@/components/common/Card';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getLoans } from '@/service/loan';
import styles from './LoanNotice.module.scss';

/**
 * 대출 상환도 매달 자동으로 기록되지만 **반복 규칙이 아니다.**
 *
 * 원리금균등은 회차마다 원금과 이자의 비율이 달라져서 고정 금액 규칙으로 표현할 수 없다.
 * 그래서 대출은 자체 상환 계획을 갖고, 이 목록에는 나타나지 않는다. 그 사실을 말해 주지
 * 않으면 "매달 나가는 돈을 다 등록했는데 왜 대출이 없지?" 하고 같은 것을 두 번 등록하게 된다.
 */
export default function LoanNotice() {
  const { data } = useQuery({ queryKey: QUERY_KEY.LOAN.LIST(), queryFn: getLoans });

  const active = (data?.loans ?? []).filter((loan) => loan.isActive);
  if (active.length === 0) return null;

  return (
    <Card title="대출 상환은 따로 관리해요">
      <p className={styles.loannotice__text}>
        등록한 대출 {active.length}건은 갚는 날마다 자동으로 적어 드려요. 이번 달에는{' '}
        <strong>{(data?.monthlyPayment ?? 0).toLocaleString('ko-KR')}원</strong>
        {(data?.monthlyInterest ?? 0) > 0 && (
          <> (그중 이자 {(data?.monthlyInterest ?? 0).toLocaleString('ko-KR')}원)</>
        )}
        이 나가요. 회차마다 원금과 이자 비율이 달라서 여기에 고정 금액으로 둘 수 없어요.
      </p>
      <Link
        className={styles.loannotice__link}
        href={`${PATH.ASSETS}?tab=loans`}
      >
        대출 보러 가기
      </Link>
    </Card>
  );
}
