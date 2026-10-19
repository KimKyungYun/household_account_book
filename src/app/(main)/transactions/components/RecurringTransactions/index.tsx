'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import { SkeletonRows } from '@/components/common/Skeleton';
import TransactionRow from '@/components/transaction/TransactionRow';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getTransactions } from '@/service/transaction';
import { cn } from '@/utils/ts/cn';
import { shiftYearMonth } from '@/utils/ts/formatDate';
import type { TransactionListItemDto } from '@/service/transaction/type';
import MonthNavigator from '../MonthNavigator';
import SummaryStats from '../SummaryStats';
import TransactionEditModal from '../TransactionEditModal';
import styles from './RecurringTransactions.module.scss';

/** 한 달에 반복 규칙이 적는 거래는 많아야 수십 건이다. 쪽을 나누지 않고 한 번에 받는다. */
const PAGE_SIZE = 200;

interface RecurringTransactionsProps {
  /** 거래 내역 탭과 함께 쓰는 달. */
  yearMonth: string;
  onMonthChange: (yearMonth: string) => void;
}

/**
 * 반복 거래 탭 — 보고 있는 달에 반복 규칙이 자동으로 적은 거래.
 *
 * 거래 내역 탭의 종류·분류·검색 필터는 걸지 않는다. 기본 필터가 옮긴 돈을 빼므로, 걸면
 * 자산 자동 적립이 여기서도 사라진다. 그래서 필터 대신 들어온·나간·옮긴 돈을 따로 더해 보여 준다.
 * 목록은 날짜 순서대로 두어 이번 달 일정처럼 읽힌다.
 */
export default function RecurringTransactions({ yearMonth, onMonthChange }: RecurringTransactionsProps) {
  const [editing, setEditing] = useState<TransactionListItemDto | null>(null);

  const params = {
    yearMonth,
    recurring: true,
    type: ['INCOME', 'EXPENSE', 'TRANSFER'],
    sort: 'date.asc',
    pageSize: PAGE_SIZE,
  };

  const { data, isPending, isPlaceholderData } = useQuery({
    queryKey: QUERY_KEY.TRANSACTION.LIST(params),
    queryFn: () => getTransactions(params),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];

  return (
    <>
      <Card
        tone="feature"
        title="반복 거래 합계"
        icon="🧮"
        description="반복 거래가 이 달에 자동으로 적은 돈이에요. 옮긴 돈과 예정된 건도 함께 세요"
      >
        <MonthNavigator
          yearMonth={yearMonth}
          onShift={(months) => onMonthChange(shiftYearMonth(yearMonth, months))}
        />
        <SummaryStats
          stats={[
            { label: '들어온 돈', value: data?.summary.incomeTotal ?? 0, tone: 'income' },
            { label: '나간 돈', value: data?.summary.expenseTotal ?? 0, tone: 'expense' },
            { label: '옮긴 돈', value: data?.summary.transferTotal ?? 0, tone: 'transfer' },
          ]}
          count={data?.summary.count ?? 0}
          isPending={isPending}
          isStale={isPlaceholderData}
        />
      </Card>

      <Card
        isFlush
        title="반복 거래로 적힌 거래"
        icon="🔁"
        description="날짜 순서대로 보여요. 눌러서 고치거나 지울 수 있어요"
        action={
          <Link
            className={styles.recurringtransactions__link}
            href={PATH.RECURRINGS}
          >
            반복 거래 관리
          </Link>
        }
      >
        {isPending ? (
          <SkeletonRows count={3} />
        ) : items.length === 0 ? (
          <EmptyState
            title="이 달에는 반복 거래로 적힌 거래가 없어요"
            description="월급·월세처럼 매달 오가는 돈을 반복 거래에 등록하면 날짜에 맞춰 자동으로 적어 드려요."
          />
        ) : (
          <ul
            className={cn(styles.recurringtransactions__list, {
              [styles['recurringtransactions__list--stale']]: isPlaceholderData,
            })}
            aria-busy={isPlaceholderData}
          >
            {items.map((item) => (
              <li key={item.id}>
                <TransactionRow
                  transaction={item}
                  onClick={setEditing}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <TransactionEditModal
        transaction={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
