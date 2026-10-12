'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Card from '@/components/common/Card';
import TransactionRow from '@/components/transaction/TransactionRow';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getTransactions } from '@/service/transaction';
import { cn } from '@/utils/ts/cn';
import { currentYearMonth, formatYearMonthLabel } from '@/utils/ts/formatDate';
import type { TransactionListItemDto } from '@/service/transaction/type';
import styles from './RecurringTransactions.module.scss';

/** 한 달에 반복 규칙이 적는 거래는 많아야 수십 건이다. 쪽을 나누지 않고 한 번에 받는다. */
const PAGE_SIZE = 200;

interface RecurringTransactionsProps {
  yearMonth: string;
  onSelect: (transaction: TransactionListItemDto) => void;
}

/**
 * 보고 있는 달에 반복 규칙이 자동으로 적은 거래.
 *
 * 위쪽 필터는 따르지 않는다 — 기본 필터가 옮긴 돈을 빼므로, 따르면 자산 자동 적립이 여기서도
 * 사라진다. 거래 내역에도 그대로 있고, 이 칸은 '어디서 왔는지'로 다시 묶어 보여 줄 뿐이다.
 * 날짜 순서대로 두어 이번 달 일정처럼 읽힌다.
 */
export default function RecurringTransactions({ yearMonth, onSelect }: RecurringTransactionsProps) {
  const params = {
    yearMonth,
    recurring: true,
    type: ['INCOME', 'EXPENSE', 'TRANSFER'],
    sort: 'date.asc',
    pageSize: PAGE_SIZE,
  };

  const { data, isPlaceholderData } = useQuery({
    queryKey: QUERY_KEY.TRANSACTION.LIST(params),
    queryFn: () => getTransactions(params),
    placeholderData: keepPreviousData,
  });

  // 반복 거래를 쓰지 않는 집이 대부분이다. 없는 달에는 빈 상자 대신 칸 자체를 숨긴다.
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  const monthLabel = yearMonth === currentYearMonth() ? '이번 달' : formatYearMonthLabel(yearMonth);

  return (
    <Card
      isFlush
      title="반복 거래로 적힌 거래"
      icon="🔁"
      description={`${monthLabel}에 반복 거래가 자동으로 적은 ${data?.page.total ?? items.length}건이에요. 옮긴 돈과 예정된 건도 함께 보여요`}
      action={
        <Link
          className={styles.recurringtransactions__link}
          href={PATH.RECURRINGS}
        >
          반복 거래 관리
        </Link>
      }
    >
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
              onClick={onSelect}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
