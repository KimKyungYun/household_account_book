'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import Amount from '@/components/common/Amount';
import Card from '@/components/common/Card';
import MoneyFlow from '@/components/common/MoneyFlow';
import Skeleton from '@/components/common/Skeleton';
import { useCountUp } from '@/hooks/useCountUp';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryShares, getOverview } from '@/service/stats';
import { currentYearMonth, formatYearMonthLabel } from '@/utils/ts/formatDate';
import styles from './DashboardStats.module.scss';

/** 띠에 이름을 달 수 있는 분류 수. 그 밖은 한 칸으로 묶는다. */
const FLOW_SEGMENTS = 6;

export default function DashboardStats() {
  const yearMonth = currentYearMonth();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.STATS.OVERVIEW(yearMonth),
    queryFn: () => getOverview(yearMonth),
  });

  // 띠를 분류 색으로 쪼개려면 분류별 지출이 필요하다. 도넛이 쓰는 쿼리와
  // 같은 키라 한 번만 받아 온다.
  const categoryParams = { yearMonth, level: 1, limit: 8 };
  const categories = useQuery({
    queryKey: QUERY_KEY.STATS.CATEGORIES(categoryParams),
    queryFn: () => getCategoryShares(categoryParams),
  });

  const income = data?.income ?? 0;
  const expense = data?.expense ?? 0;
  const net = data?.net ?? 0;

  // 이 화면의 결론은 남은 돈이다. 0 에서 올라가며 눈이 그 자리에 머문다.
  const countedNet = useCountUp(net);

  const segments = useMemo(
    () =>
      (categories.data ?? []).slice(0, FLOW_SEGMENTS).map((row) => ({
        id: row.categoryId,
        name: row.name,
        amount: row.amount,
        colorHex: row.colorHex,
      })),
    [categories.data],
  );

  if (isPending) return <Skeleton height={240} />;

  const delta = data?.expenseDeltaRate ?? null;

  return (
    <Card
      tone="feature"
      title={formatYearMonthLabel(yearMonth)}
      description="아직 날짜가 오지 않은 거래까지 더한 이번 달 전체입니다."
    >
      <div className={styles.dashboardstats}>
        {/* 이 달의 한 문장. 번 것에서 쓴 것을 뺀 값이 이 화면의 결론이다. */}
        <p className={styles.dashboardstats__hero}>
          <span className={styles.dashboardstats__herolabel}>{net < 0 ? '모자란 돈' : '남은 돈'}</span>
          <Amount
            value={countedNet}
            tone={net < 0 ? 'expense' : 'income'}
            size="hero"
          />
        </p>

        {/* 번 돈 한 줄에서 쓴 돈이 빠져나가고 남은 만큼이 비어 있다. */}
        <MoneyFlow
          income={income}
          expense={expense}
          segments={segments}
        />

        {/* 띠가 말한 것을 숫자로 받는다. 한 줄에 둬야 띠와 한 덩이로 읽힌다. */}
        <dl className={styles.dashboardstats__pair}>
          <div className={styles.dashboardstats__item}>
            <dt>
              <span
                className={styles.dashboardstats__mark}
                data-kind="income"
                aria-hidden="true"
              />
              번 돈
            </dt>
            <dd>
              <Amount
                value={income}
                tone="income"
                size="medium"
              />
            </dd>
          </div>

          <div className={styles.dashboardstats__item}>
            <dt>
              <span
                className={styles.dashboardstats__mark}
                data-kind="expense"
                aria-hidden="true"
              />
              쓴 돈
            </dt>
            <dd>
              <Amount
                value={expense}
                tone="expense"
                size="medium"
              />
              {delta !== null && (
                <span className={styles.dashboardstats__delta}>
                  전월 대비 {delta > 0 ? '+' : ''}
                  {(delta * 100).toFixed(0)}%
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
