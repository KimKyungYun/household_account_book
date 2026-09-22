'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import Card from '@/components/common/Card';
import CustomEcharts from '@/components/common/CustomEcharts';
import { quietCategoryAxis, quietValueAxis, useBaseOption } from '@/components/common/CustomEcharts/useBaseOption';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getMonthlyTrend } from '@/service/stats';
import { currentYearMonth, shiftYearMonth } from '@/utils/ts/formatDate';
import styles from './DashboardTrend.module.scss';
import type { EChartsOption } from 'echarts';

const MONTHS_BACK = 5;

export default function DashboardTrend() {
  const to = currentYearMonth();
  const from = shiftYearMonth(to, -MONTHS_BACK);
  const { colors, base } = useBaseOption();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.STATS.MONTHLY({ from, to }),
    queryFn: () => getMonthlyTrend({ from, to }),
  });

  const points = useMemo(() => data ?? [], [data]);

  // 옵션을 렌더마다 새로 만들면 차트가 매번 처음부터 다시 그려진다.
  const option = useMemo<EChartsOption>(() => ({
    ...base,
    xAxis: quietCategoryAxis(colors, points.map((point) => `${Number(point.yearMonth.slice(5))}월`)),
    yAxis: quietValueAxis(colors),
    series: [
      {
        name: '수입',
        type: 'bar',
        data: points.map((point) => point.income),
        itemStyle: { color: colors.income, borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 26,
        barGap: '12%',
      },
      {
        name: '지출',
        type: 'bar',
        data: points.map((point) => point.expense),
        itemStyle: { color: colors.expense, borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 26,
      },
    ],
  }), [base, colors, points]);

  if (isPending) return <Skeleton height={300} />;

  const hasData = points.some((point) => point.income !== 0 || point.expense !== 0);

  if (!hasData) {
    return (
      <Card
        title="월별 수입·지출"
        description="최근 6개월간의 수입과 지출입니다."
      >
        <EmptyState
          title="표시할 내용이 없습니다"
          description="두 달 이상 기록하면 달마다 비교할 수 있습니다."
        />
      </Card>
    );
  }

  return (
    <Card
      title="월별 수입·지출"
      description="최근 6개월간의 수입과 지출입니다. 왼쪽 숫자는 만 원 단위입니다."
    >
      {/* 범례 대신 색을 직접 설명한다 — 차트 안에 글씨를 덜 넣는 쪽이 조용하다. */}
      <ul className={styles.dashboardtrend__keys}>
        <li className={styles.dashboardtrend__key}>
          <span
            className={styles.dashboardtrend__swatch}
            style={{ backgroundColor: colors.income }}
            aria-hidden="true"
          />
          수입
        </li>
        <li className={styles.dashboardtrend__key}>
          <span
            className={styles.dashboardtrend__swatch}
            style={{ backgroundColor: colors.expense }}
            aria-hidden="true"
          />
          지출
        </li>
      </ul>

      <CustomEcharts
        option={option}
        height={190}
        ariaLabel="최근 6개월 수입과 지출 막대 차트"
      />
    </Card>
  );
}
