'use client';

import { useQuery } from '@tanstack/react-query';
import Card from '@/components/common/Card';
import CountUpAmount from '@/components/common/CountUpAmount';
import Reveal from '@/components/common/Reveal';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryShares, getOverview } from '@/service/stats';
import { currentYearMonth, formatYearMonthLabel } from '@/utils/ts/formatDate';
import { categoryParamsOf } from '../../utils/categoryParams';
import MoneyBox from '../MoneyBox';
import styles from './DashboardStats.module.scss';

const DESCRIPTION = '이번 달에 예정된 거래까지 미리 계산된 금액이에요';

/** 전월 대비 지출 — 줄었으면 칭찬, 늘었으면 담백하게. */
function deltaText(rate: number | null): string | null {
  if (rate === null) return null;

  const percent = Math.round(Math.abs(rate) * 100);
  if (percent === 0) return '지난달과 비슷하게 썼어요';

  return rate < 0 ? `지난달보다 ${percent}% 덜 썼어요` : `지난달보다 ${percent}% 더 썼어요`;
}

export default function DashboardStats() {
  const yearMonth = currentYearMonth();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.STATS.OVERVIEW(yearMonth),
    queryFn: () => getOverview(yearMonth),
  });

  const expenseParams = categoryParamsOf(yearMonth, 'EXPENSE');
  const incomeParams = categoryParamsOf(yearMonth, 'INCOME');
  const expenseRows = useQuery({
    queryKey: QUERY_KEY.STATS.CATEGORIES(expenseParams),
    queryFn: () => getCategoryShares(expenseParams),
  });
  const incomeRows = useQuery({
    queryKey: QUERY_KEY.STATS.CATEGORIES(incomeParams),
    queryFn: () => getCategoryShares(incomeParams),
  });

  if (isPending) {
    return (
      <Card
        tone="feature"
        title={formatYearMonthLabel(yearMonth)}
        description={DESCRIPTION}
      >
        {/* 남은 돈 · 번 돈/쓴 돈 두 상자 — 실제 배치를 그대로 따른다. */}
        <div
          className={styles.dashboardstats}
          role="status"
          aria-label="불러오는 중"
        >
          <div className={styles.dashboardstats__hero}>
            <Skeleton
              width={56}
              height={14}
            />
            <Skeleton
              width={220}
              height={44}
            />
          </div>
          <div className={styles.dashboardstats__boxes}>
            <Skeleton height={180} />
            <Skeleton height={180} />
          </div>
        </div>
      </Card>
    );
  }

  const income = data?.income ?? 0;
  const expense = data?.expense ?? 0;
  const net = data?.net ?? 0;
  const delta = deltaText(data?.expenseDeltaRate ?? null);

  return (
    <Card
      tone="feature"
      title={formatYearMonthLabel(yearMonth)}
      description={DESCRIPTION}
    >
      <Reveal className={styles.dashboardstats}>
        {/* 이 달의 한 문장. 번 것에서 쓴 것을 뺀 값이 이 화면의 결론이다. */}
        <p className={styles.dashboardstats__hero}>
          <span className={styles.dashboardstats__herolabel}>{net < 0 ? '모자란 돈' : '남은 돈'}</span>
          <CountUpAmount
            value={net}
            tone={net < 0 ? 'expense' : 'income'}
            size="hero"
          />
        </p>

        {/* 번 돈과 쓴 돈을 좌우 상자로 나눠, 각각 어디서 들어오고 어디로 나갔는지 몇 줄씩 보여 준다. */}
        <div className={styles.dashboardstats__boxes}>
          <MoneyBox
            kind="income"
            label="번 돈"
            total={income}
            rows={incomeRows.data}
            emptyText="아직 들어온 돈이 없어요"
          />
          <MoneyBox
            kind="expense"
            label="쓴 돈"
            total={expense}
            rows={expenseRows.data}
            emptyText="아직 쓴 돈이 없어요"
            footnote={delta}
          />
        </div>
      </Reveal>
    </Card>
  );
}
