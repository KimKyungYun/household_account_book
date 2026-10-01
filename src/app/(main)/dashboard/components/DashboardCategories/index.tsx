'use client';

import { useQuery } from '@tanstack/react-query';
import Amount from '@/components/common/Amount';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Reveal from '@/components/common/Reveal';
import { SkeletonRows } from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryShares } from '@/service/stats';
import { currentYearMonth } from '@/utils/ts/formatDate';
import { categoryParamsOf } from '../../utils/categoryParams';
import CategoryAmountList from '../CategoryAmountList';
import styles from './DashboardCategories.module.scss';

const TITLE = '분류별 지출';
const DESCRIPTION = '이번 달은 이렇게 돈을 썼어요';

/** 이번 달 지출을 분류마다 아이콘·비중·금액으로 늘어놓고, 맨 아래에 총합을 둔다. */
export default function DashboardCategories() {
  const params = categoryParamsOf(currentYearMonth(), 'EXPENSE');
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.STATS.CATEGORIES(params),
    queryFn: () => getCategoryShares(params),
  });

  const rows = data ?? [];
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Card
      title={TITLE}
      description={DESCRIPTION}
    >
      {isPending ? (
        <SkeletonRows
          count={5}
          isPadded={false}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="이번 달은 아직 쓴 돈이 없어요"
          description="지출을 적으면 여기에 보여 드릴게요."
        />
      ) : (
        <Reveal className={styles.dashboardcategories}>
          <CategoryAmountList rows={rows} />

          <p className={styles.dashboardcategories__total}>
            <span className={styles.dashboardcategories__totallabel}>총 지출</span>
            <Amount
              value={total}
              tone="expense"
              size="large"
            />
          </p>
        </Reveal>
      )}
    </Card>
  );
}
