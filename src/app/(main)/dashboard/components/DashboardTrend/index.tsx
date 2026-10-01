'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import Card from '@/components/common/Card';
import Reveal from '@/components/common/Reveal';
import CustomEcharts from '@/components/common/CustomEcharts';
import { fadingBar, quietCategoryAxis, quietValueAxis, useBaseOption } from '@/components/common/CustomEcharts/useBaseOption';
import EmptyState from '@/components/common/EmptyState';
import { SkeletonChart } from '@/components/common/Skeleton';
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
  // 이번 달(맨 오른쪽)만 진하게, 지난 달들은 옅게 — 눈이 먼저 이번 달에 간다.
  const option = useMemo<EChartsOption>(() => {
    const lastIndex = points.length - 1;
    const barsOf = (key: 'income' | 'expense', color: string) =>
      points.map((point, index) => ({
        value: point[key],
        itemStyle: { color: fadingBar(color, index === lastIndex), borderRadius: [8, 8, 2, 2] },
      }));

    return {
      ...base,
      xAxis: quietCategoryAxis(colors, points.map((point) => `${Number(point.yearMonth.slice(5))}월`)),
      yAxis: quietValueAxis(colors),
      series: [
        {
          name: '수입',
          type: 'bar',
          data: barsOf('income', colors.income),
          barMaxWidth: 22,
          barGap: '18%',
        },
        {
          name: '지출',
          type: 'bar',
          data: barsOf('expense', colors.expense),
          barMaxWidth: 22,
        },
      ],
    };
  }, [base, colors, points]);

  if (isPending) {
    return (
      <Card
        title="월별 수입·지출"
        description="최근 6개월 동안 이렇게 벌고 썼어요. 왼쪽 숫자는 만 원 단위예요"
      >
        <SkeletonChart height={190} />
      </Card>
    );
  }

  const hasData = points.some((point) => point.income !== 0 || point.expense !== 0);

  if (!hasData) {
    return (
      <Card
        title="월별 수입·지출"
        description="최근 6개월 동안 이렇게 벌고 썼어요"
      >
        <EmptyState
          title="아직 보여 드릴 내용이 없어요"
          description="두 달 넘게 적으면 달마다 비교해 드릴게요."
        />
      </Card>
    );
  }

  return (
    <Card
      title="월별 수입·지출"
      description="최근 6개월 동안 이렇게 벌고 썼어요. 왼쪽 숫자는 만 원 단위예요"
    >
      {/* 범례 대신 색을 직접 설명한다 — 차트 안에 글씨를 덜 넣는 쪽이 조용하다. */}
      <Reveal className={styles.dashboardtrend__content}>
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

        {/* 옆 카드에 맞춰 늘어난 만큼 차트가 키를 키운다 — 고정 높이면 아래가 비어 보인다. */}
        <div className={styles.dashboardtrend__chart}>
          <CustomEcharts
            option={option}
            height="100%"
            ariaLabel="최근 6개월 수입과 지출 막대 차트"
          />
        </div>
      </Reveal>
    </Card>
  );
}
