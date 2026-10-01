'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Amount from '@/components/common/Amount';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Icon from '@/components/common/Icon';
import MoneyInput from '@/components/common/MoneyInput';
import ProgressBar from '@/components/common/ProgressBar';
import Skeleton, { SkeletonRows } from '@/components/common/Skeleton';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { copyBudgets, getBudgetMonth, putBudgets } from '@/service/budget';
import { cn } from '@/utils/ts/cn';
import { currentYearMonth, formatYearMonthLabel, shiftYearMonth } from '@/utils/ts/formatDate';
import type { BudgetRowDto, BudgetStatus } from '@/service/budget/type';
import styles from './BudgetBoard.module.scss';

const STATUS_BADGE: Record<BudgetStatus, { tone: 'neutral' | 'success' | 'warning' | 'error'; label: string } | null> = {
  NO_BUDGET: null,
  UNDER: null,
  WARNING: { tone: 'warning', label: '80% 넘음' },
  OVER: { tone: 'error', label: '초과' },
};

export default function BudgetBoard() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [drafts, setDrafts] = useState<Record<string, number | null>>({});
  const queryClient = useQueryClient();

  // 달을 넘기는 동안 앞 달 예산을 흐리게 남겨 둔다. 앞뒤 달은 미리 받아 둔다.
  const { data, isPending, isPlaceholderData } = useQuery({
    queryKey: QUERY_KEY.BUDGET.MONTH(yearMonth),
    queryFn: () => getBudgetMonth(yearMonth),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    for (const month of [shiftYearMonth(yearMonth, -1), shiftYearMonth(yearMonth, 1)]) {
      void queryClient.prefetchQuery({
        queryKey: QUERY_KEY.BUDGET.MONTH(month),
        queryFn: () => getBudgetMonth(month),
      });
    }
  }, [yearMonth, queryClient]);

  const refresh = () => {
    setDrafts({});
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.BUDGET.ALL });
  };

  const save = useMutation({
    mutationFn: () =>
      putBudgets({
        yearMonth,
        items: Object.entries(drafts).map(([categoryId, amount]) => ({ categoryId, amount })),
      }),
    onSuccess: () => {
      toast.success('예산을 저장했습니다.');
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '저장하지 못했습니다.'),
  });

  const copy = useMutation({
    mutationFn: () => copyBudgets({ fromYearMonth: shiftYearMonth(yearMonth, -1), toYearMonth: yearMonth, overwrite: false }),
    onSuccess: ({ copied }) => {
      toast.success(`전월 예산 ${copied}건을 가져왔습니다.`);
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '가져오지 못했습니다.'),
  });

  const parents = (data?.rows ?? []).filter((row) => row.level === 1);
  const hasDrafts = Object.keys(drafts).length > 0;

  const valueOf = (row: BudgetRowDto) => (row.categoryId in drafts ? drafts[row.categoryId] ?? null : row.budgetAmount);

  return (
    <>
      <Card
        tone="feature"
        title="이번 달 예산"
        description="분류마다 쓸 금액을 정해 두면 남은 예산이 표시됩니다."
      >
        <div className={styles.budgetboard__head}>
          <div className={styles.budgetboard__month}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setYearMonth((current) => shiftYearMonth(current, -1)); setDrafts({}); }}
              iconLeft={<Icon
                name="chevronLeft"
                size={16}
              />}
            >
              지난 달
            </Button>
            <span className={styles.budgetboard__monthlabel}>{formatYearMonthLabel(yearMonth)}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setYearMonth((current) => shiftYearMonth(current, 1)); setDrafts({}); }}
              iconRight={<Icon
                name="chevronRight"
                size={16}
              />}
            >
              다음 달
            </Button>
          </div>

          <div className={styles.budgetboard__actions}>
            <Button
              size="sm"
              variant="secondary"
              isLoading={copy.isPending}
              onClick={() => copy.mutate()}
              title="지난달 금액을 이번 달로 복사합니다"
            >
              지난 달과 똑같이
            </Button>
            <Button
              size="sm"
              disabled={!hasDrafts}
              isLoading={save.isPending}
              onClick={() => save.mutate()}
            >
              저장
            </Button>
          </div>
        </div>

        {isPending && (
          <div
            className={styles.budgetboard__totals}
            role="status"
            aria-label="불러오는 중"
          >
            {['예산', '지출', '남은 예산'].map((label) => (
              <div
                key={label}
                className={styles.budgetboard__total}
              >
                <span className={styles.budgetboard__totallabel}>{label}</span>
                <Skeleton
                  width={96}
                  height={26}
                />
              </div>
            ))}
          </div>
        )}

        {data && (
          <div className={cn(styles.budgetboard__totals, { [styles['budgetboard__totals--stale']]: isPlaceholderData })}>
            <div className={styles.budgetboard__total}>
              <span className={styles.budgetboard__totallabel}>예산</span>
              <Amount
                value={data.totals.budgetAmount}
                size="large"
              />
            </div>
            <div className={styles.budgetboard__total}>
              <span className={styles.budgetboard__totallabel}>지출</span>
              <Amount
                value={data.totals.actualAmount}
                tone="expense"
                size="large"
              />
            </div>
            <div className={styles.budgetboard__total}>
              <span className={styles.budgetboard__totallabel}>남은 예산</span>
              <Amount
                value={data.totals.remaining}
                tone={data.totals.remaining < 0 ? 'expense' : 'income'}
                size="large"
              />
            </div>
          </div>
        )}
      </Card>

      <Card
        title="분류별 예산"
        description="오른쪽 칸에 금액을 입력하고 저장하세요. 비워 두면 예산을 정하지 않은 상태이고, 0원으로 두면 한 푼도 쓰지 않겠다는 뜻입니다."
      >
        {isPending ? (
          <SkeletonRows
            count={6}
            isPadded={false}
          />
        ) : (
          <div
            className={cn(styles.budgetboard__body, { [styles['budgetboard__body--stale']]: isPlaceholderData })}
            aria-busy={isPlaceholderData}
          >

            <ul className={styles.budgetboard__list}>
              {parents.map((row) => {
                const amount = valueOf(row);
                const usage = amount === null ? null : amount === 0 ? (row.actualAmount > 0 ? 1 : 0) : row.actualAmount / amount;
                const badge = STATUS_BADGE[amount === null ? 'NO_BUDGET' : usage !== null && usage > 1 ? 'OVER' : usage !== null && usage >= 0.8 ? 'WARNING' : 'UNDER'];

                return (
                  <li
                    key={row.categoryId}
                    className={styles.budgetboard__row}
                  >
                    <div className={styles.budgetboard__rowhead}>
                      <span className={styles.budgetboard__name}>{row.name}</span>
                      {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                      <span className={styles.budgetboard__spent}>
                        <Amount
                          value={row.actualAmount}
                          size="small"
                          tone="expense"
                        />
                        {amount !== null && (
                          <span className={styles.budgetboard__of}>
                            {' / '}
                            <Amount
                              value={amount}
                              size="small"
                            />
                          </span>
                        )}
                      </span>
                    </div>

                    {usage !== null && (
                      <ProgressBar
                        ratio={usage}
                        ariaLabel={`${row.name} 예산 소진율`}
                      />
                    )}

                    <div className={styles.budgetboard__input}>
                      <MoneyInput
                        value={amount}
                        placeholder="예산 적기"
                        onChange={(next) => setDrafts((previous) => ({ ...previous, [row.categoryId]: next }))}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>
    </>
  );
}
