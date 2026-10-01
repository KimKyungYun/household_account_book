'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Amount from '@/components/common/Amount';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import Modal from '@/components/common/Modal';
import { SkeletonCalendar, SkeletonRows } from '@/components/common/Skeleton';
import TransactionForm, { useIsTransactionFormSaving } from '@/components/transaction/TransactionForm';
import MonthGrid from '@/components/transaction/MonthGrid';
import TransactionRow from '@/components/transaction/TransactionRow';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getTransactions } from '@/service/transaction';
import { getDailyTotals } from '@/service/stats';
import { cn } from '@/utils/ts/cn';
import { currentYearMonth, formatDateLabel, formatYearMonthLabel, monthRange, shiftYearMonth, todayInSeoul } from '@/utils/ts/formatDate';
import type { TransactionListItemDto } from '@/service/transaction/type';
import styles from './CalendarBoard.module.scss';

const CREATE_FORM_ID = 'calendar-create-form';
const EDIT_FORM_ID = 'calendar-edit-form';

export default function CalendarBoard() {
  const today = todayInSeoul();
  // 대시보드에서 날짜를 눌러 넘어오면 그 날을 펴 둔다.
  const requested = useSearchParams().get('date');
  const initial = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;

  const [yearMonth, setYearMonth] = useState(initial.slice(0, 7));
  const [selected, setSelected] = useState<string>(initial);
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<TransactionListItemDto | null>(null);
  const queryClient = useQueryClient();

  // 달을 넘기는 동안 앞 달 달력을 흐리게 남겨 둔다.
  const daily = useQuery({
    queryKey: QUERY_KEY.STATS.DAILY(yearMonth),
    queryFn: () => getDailyTotals(yearMonth),
    placeholderData: keepPreviousData,
  });

  // 앞뒤 달 달력을 미리 받아 둔다. '지난 달'·'다음 달'을 누르는 순간 바로 그려진다.
  useEffect(() => {
    for (const month of [shiftYearMonth(yearMonth, -1), shiftYearMonth(yearMonth, 1)]) {
      void queryClient.prefetchQuery({
        queryKey: QUERY_KEY.STATS.DAILY(month),
        queryFn: () => getDailyTotals(month),
      });
    }
  }, [yearMonth, queryClient]);

  // 고른 날짜 하루치. 달력 숫자와 같은 데이터를 두 번 세지 않고 목록만 따로 받는다.
  const dayParams = { from: selected, to: selected, pageSize: 50, sort: 'date.desc' as const, page: 1 };
  const dayList = useQuery({
    queryKey: QUERY_KEY.TRANSACTION.LIST(dayParams),
    queryFn: () => getTransactions(dayParams),
    placeholderData: keepPreviousData,
  });
  const isCreateSaving = useIsTransactionFormSaving(CREATE_FORM_ID);
  const isEditSaving = useIsTransactionFormSaving(EDIT_FORM_ID);

  const totals = useMemo(
    () => new Map((daily.data ?? []).map((row) => [row.date, row])),
    [daily.data],
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.STATS.ALL });
  };

  const moveMonth = (months: number) => {
    const next = shiftYearMonth(yearMonth, months);
    setYearMonth(next);
    // 달을 옮기면 그 달 1일을 고른다 — 지난 달의 날짜가 남아 있으면 목록이 비어 보인다.
    setSelected(next === currentYearMonth() ? today : monthRange(next).from);
  };

  const monthTotal = (daily.data ?? []).reduce(
    (sum, row) => ({ income: sum.income + row.income, expense: sum.expense + row.expense }),
    { income: 0, expense: 0 },
  );

  return (
    <>
      <Card
        tone="feature"
        title={`${formatYearMonthLabel(yearMonth)} 달력`}
        description="날짜를 누르면 그날 쓰고 번 돈을 보고, 바로 등록할 수 있습니다."
        action={
          <div className={styles.calendarboard__nav}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => moveMonth(-1)}
              iconLeft={<Icon
                name="chevronLeft"
                size={16}
              />}
            >
              지난 달
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => moveMonth(1)}
              iconRight={<Icon
                name="chevronRight"
                size={16}
              />}
            >
              다음 달
            </Button>
          </div>
        }
      >
        {daily.isPending ? (
          <SkeletonCalendar />
        ) : (
          <div
            className={cn(styles.calendarboard__month, { [styles['calendarboard__month--stale']]: daily.isPlaceholderData })}
            aria-busy={daily.isPlaceholderData}
          >
            <div className={styles.calendarboard__summary}>
              <span className={styles.calendarboard__summaryitem}>
                번 돈
                <Amount
                  value={monthTotal.income}
                  tone="income"
                  size="medium"
                  isCompact
                />
              </span>
              <span className={styles.calendarboard__summaryitem}>
                쓴 돈
                <Amount
                  value={monthTotal.expense}
                  tone="expense"
                  size="medium"
                  isCompact
                />
              </span>
            </div>

            <MonthGrid
              yearMonth={yearMonth}
              totals={totals}
              today={today}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        )}
      </Card>

      <Card
        title={formatDateLabel(selected)}
        description="이 날에 오간 돈입니다."
        isFlush
        action={
          <Button
            size="sm"
            iconLeft={<Icon
              name="plus"
              size={16}
            />}
            onClick={() => setIsCreating(true)}
          >
            이 날에 등록
          </Button>
        }
      >
        {dayList.isPending ? (
          <SkeletonRows count={3} />
        ) : (dayList.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="이 날은 기록이 없습니다"
            description="위의 '이 날에 등록'을 누르면 이 날짜로 바로 적을 수 있습니다."
          />
        ) : (
          <ul
            className={cn(styles.calendarboard__list, { [styles['calendarboard__list--stale']]: dayList.isPlaceholderData })}
            aria-busy={dayList.isPlaceholderData}
          >
            {dayList.data?.items.map((transaction) => (
              <li key={transaction.id}>
                <TransactionRow
                  transaction={transaction}
                  onClick={setEditing}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title={`${formatDateLabel(selected)} 거래 등록`}
        footer={
          <div className={styles.calendarboard__actions}>
            <Button
              variant="secondary"
              onClick={() => setIsCreating(false)}
            >
              닫기
            </Button>
            <Button
              type="submit"
              form={CREATE_FORM_ID}
              isLoading={isCreateSaving}
            >
              등록
            </Button>
          </div>
        }
      >
        <TransactionForm
          mode="create"
          defaultDate={selected}
          formId={CREATE_FORM_ID}
          onSuccess={refresh}
        />
      </Modal>

      <Modal
        key={editing?.id ?? 'none'}
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="거래 수정"
        footer={
          <div className={styles.calendarboard__actions}>
            <Button
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              닫기
            </Button>
            <Button
              type="submit"
              form={EDIT_FORM_ID}
              isLoading={isEditSaving}
            >
              저장
            </Button>
          </div>
        }
      >
        {editing && (
          <TransactionForm
            mode="edit"
            transaction={editing}
            formId={EDIT_FORM_ID}
            onSuccess={() => {
              refresh();
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
