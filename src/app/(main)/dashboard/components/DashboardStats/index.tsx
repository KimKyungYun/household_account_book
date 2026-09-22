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

  if (isPending) return <Skeleton height={148} />;

  const delta = data?.expenseDeltaRate ?? null;

  return (
    <Card title={`${formatYearMonthLabel(yearMonth)} 요약`}>
      <dl className={styles.dashboardstats}>
        <div className={styles.dashboardstats__item}>
          <dt>수입</dt>
          <dd>
            <Amount
              value={data?.income ?? 0}
              tone="income"
              size="large"
            />
          </dd>
        </div>

        <div className={styles.dashboardstats__item}>
          <dt>지출</dt>
          <dd className={styles.dashboardstats__value}>
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

        <div className={styles.dashboardstats__item}>
          <dt>남은 돈</dt>
          <dd>
            <Amount
              value={data?.net ?? 0}
              tone={(data?.net ?? 0) < 0 ? 'expense' : 'income'}
              size="large"
            />
          </dd>
        </div>

        <div className={styles.dashboardstats__item}>
          <dt>확인 필요</dt>
          <dd>
            {(data?.pendingCount ?? 0) > 0 ? (
              <Link
                className={styles.dashboardstats__pending}
                href={PATH.TRANSACTIONS}
              >
                <Badge tone="warning">{data?.pendingCount}건</Badge>
              </Link>
            ) : (
              <span className={styles.dashboardstats__none}>없음</span>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
