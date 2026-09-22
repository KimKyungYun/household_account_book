'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Amount from '@/components/common/Amount';
import Badge from '@/components/common/Badge';
import Card from '@/components/common/Card';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getOverview } from '@/service/stats';
import { currentYearMonth, formatYearMonthLabel } from '@/utils/ts/formatDate';
import styles from './DashboardStats.module.scss';

export default function DashboardStats() {
  const yearMonth = currentYearMonth();
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.STATS.OVERVIEW(yearMonth),
    queryFn: () => getOverview(yearMonth),
  });

  if (isPending) return <Skeleton height={190} />;

  const net = data?.net ?? 0;
  const delta = data?.expenseDeltaRate ?? null;
  const pending = data?.pendingCount ?? 0;

  return (
    <Card
      tone="feature"
      title={`${formatYearMonthLabel(yearMonth)} 요약`}
      description="아직 날짜가 오지 않은 반복 거래까지 더한 이번 달 전체입니다. 계좌끼리 옮긴 금액과 카드값은 '옮긴 돈'이라 합계에서 빠집니다."
      action={
        pending > 0 ? (
          <Link href={PATH.TRANSACTIONS}>
            <Badge tone="warning">금액 확인 {pending}건</Badge>
          </Link>
        ) : undefined
      }
    >
      <div className={styles.dashboardstats}>
        {/* 이 달의 한 문장. 번 것에서 쓴 것을 뺀 값이 이 화면의 결론이다. */}
        <div className={styles.dashboardstats__hero}>
          <span className={styles.dashboardstats__herolabel}>{net < 0 ? '모자란 돈' : '남은 돈'}</span>
          <Amount
            value={net}
            tone={net < 0 ? 'expense' : 'income'}
            size="hero"
          />
        </div>

        <dl className={styles.dashboardstats__pair}>
          <div className={styles.dashboardstats__item}>
            <dt>
              <span
                className={styles.dashboardstats__mark}
                data-kind="income"
                aria-hidden="true"
              />
              수입
            </dt>
            <dd>
              <Amount
                value={data?.income ?? 0}
                tone="income"
                size="large"
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
              지출
            </dt>
            <dd>
              <Amount
                value={data?.expense ?? 0}
                tone="expense"
                size="large"
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
