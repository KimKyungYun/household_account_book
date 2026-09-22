'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Amount from '@/components/common/Amount';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import ProgressBar from '@/components/common/ProgressBar';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getBudgetMonth } from '@/service/budget';
import { currentYearMonth } from '@/utils/ts/formatDate';
import styles from './DashboardBudget.module.scss';

const SHOW_LIMIT = 4;

/** 예산을 정해 둔 분류만, 많이 쓴 순서로 보여준다. 정한 게 없으면 정하러 가는 길만 남긴다. */
export default function DashboardBudget() {
  const yearMonth = currentYearMonth();
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.BUDGET.MONTH(yearMonth),
    queryFn: () => getBudgetMonth(yearMonth),
  });

  if (isPending) return <Skeleton height={220} />;

  const rows = (data?.rows ?? [])
    .filter((row) => row.level === 1 && row.budgetAmount !== null)
    .sort((a, b) => (b.usageRate ?? 0) - (a.usageRate ?? 0))
    .slice(0, SHOW_LIMIT);

  if (rows.length === 0) {
    return (
      <Card
        title="예산"
        description="분류마다 쓸 금액을 정해 두면 남은 예산이 여기에 표시됩니다."
      >
        <EmptyState
          title="정해 둔 예산이 없습니다"
          description="식비, 교통비처럼 자주 쓰는 분류부터 정해 보세요."
          action={
            <Link href={PATH.BUDGETS}>
              <Button size="sm">예산 정하러 가기</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title="예산"
      description="많이 쓴 분류부터 표시합니다."
      action={
        <Link href={PATH.BUDGETS}>
          <Button
            size="sm"
            variant="ghost"
          >
            전체 보기
          </Button>
        </Link>
      }
    >
      <ul className={styles.dashboardbudget}>
        {rows.map((row) => {
          const rate = row.usageRate ?? 0;
          const left = row.remaining ?? 0;

          return (
            <li
              key={row.categoryId}
              className={styles.dashboardbudget__item}
            >
              <div className={styles.dashboardbudget__head}>
                <span className={styles.dashboardbudget__name}>{row.name}</span>
                <span className={styles.dashboardbudget__left}>
                  {left < 0 ? '넘음 ' : '남음 '}
                  <Amount
                    value={Math.abs(left)}
                    size="small"
                    tone={left < 0 ? 'expense' : 'neutral'}
                    withUnit={false}
                  />
                </span>
              </div>

              <ProgressBar
                ratio={rate}
                ariaLabel={`${row.name} 예산 사용률`}
              />

              <span className={styles.dashboardbudget__detail}>
                <span className={styles.dashboardbudget__used}>
                  <Amount
                    value={row.actualAmount}
                    size="small"
                    withUnit={false}
                  />
                  {' / '}
                  <Amount
                    value={row.budgetAmount ?? 0}
                    size="small"
                    withUnit={false}
                  />
                </span>
                <span className={styles.dashboardbudget__rate}>{Math.round(rate * 100)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
