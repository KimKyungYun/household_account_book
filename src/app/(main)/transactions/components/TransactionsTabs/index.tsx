'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { PATH, TRANSACTIONS_QUERY } from '@/routes/paths';
import { currentYearMonth } from '@/utils/ts/formatDate';
import RecurringTransactions from '../RecurringTransactions';
import TransactionBoard from '../TransactionBoard';

const TABS = [
  { value: 'list', label: '거래 내역' },
  { value: 'recurring', label: '반복 거래' },
] as const;

/** 주소에 실려 온 달(대시보드의 '전체 보기'). 이상한 값이면 이번 달. */
function initialMonthOf(search: URLSearchParams): string {
  const month = search.get(TRANSACTIONS_QUERY.MONTH) ?? '';

  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : currentYearMonth();
}

/**
 * 거래 내역과 반복 거래를 탭으로 가른다.
 *
 * 탭 상태는 `?tab=` 에 두어 새로고침·뒤로가기에서도 보던 탭이 남는다(자산 화면과 같은 방식).
 * 달은 두 탭이 함께 쓴다 — 9월 거래를 보다가 반복 거래 탭으로 넘어가면 9월 반복 거래가 보여야 한다.
 */
export default function TransactionsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get(TRANSACTIONS_QUERY.TAB) === 'recurring' ? 'recurring' : 'list';
  const [yearMonth, setYearMonth] = useState(() => initialMonthOf(searchParams));

  return (
    <>
      <SegmentedControl
        name="transactions-tab"
        options={TABS}
        value={tab}
        ariaLabel="거래 내역과 반복 거래 전환"
        onChange={(next) => router.replace(
          next === 'recurring' ? `${PATH.TRANSACTIONS}?${TRANSACTIONS_QUERY.TAB}=recurring` : PATH.TRANSACTIONS,
          { scroll: false },
        )}
      />

      {tab === 'list' ? (
        <TransactionBoard
          yearMonth={yearMonth}
          onMonthChange={setYearMonth}
        />
      ) : (
        <RecurringTransactions
          yearMonth={yearMonth}
          onMonthChange={setYearMonth}
        />
      )}
    </>
  );
}
