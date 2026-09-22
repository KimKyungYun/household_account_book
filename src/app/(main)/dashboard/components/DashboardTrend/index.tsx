'use client';

import { useQuery } from '@tanstack/react-query';
import Card from '@/components/common/Card';
import CustomEcharts from '@/components/common/CustomEcharts';
import { useBaseOption } from '@/components/common/CustomEcharts/useBaseOption';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getMonthlyTrend } from '@/service/stats';
import { currentYearMonth, shiftYearMonth } from '@/utils/ts/formatDate';
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

  if (isPending) return <Skeleton height={280} />;

  const points = data ?? [];
  const hasData = points.some((point) => point.income !== 0 || point.expense !== 0);

  if (!hasData) {
    return (
      <Card title="최근 6개월 추이">
        <EmptyState
          title="아직 그릴 데이터가 없습니다"
          description="거래를 두 달 이상 기록하면 흐름이 보입니다."
        />
      </Card>
    );
  }

  const option: EChartsOption = {
    ...base,
    legend: {
      data: ['수입', '지출'],
      top: 0,
      right: 0,
      textStyle: { color: colors.textSecondary, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: 'category',
      data: points.map((point) => `${Number(point.yearMonth.slice(5))}월`),
      axisLine: { lineStyle: { color: colors.axis } },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: colors.grid } },
      axisLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        // 만 원 단위로 줄여 축이 자릿수에 먹히지 않게 한다.
        formatter: (value: number) => (value === 0 ? '0' : `${Math.round(value / 10_000)}만`),
      },
    },
    series: [
      {
        name: '수입',
        type: 'bar',
        data: points.map((point) => point.income),
        itemStyle: { color: colors.income, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 18,
      },
      {
        name: '지출',
        type: 'bar',
        data: points.map((point) => point.expense),
        itemStyle: { color: colors.expense, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 18,
      },
    ],
  };

  return (
    <Card title="최근 6개월 추이">
      <CustomEcharts
        option={option}
        height={240}
        ariaLabel="최근 6개월 수입과 지출 막대 차트"
      />
    </Card>
  );
}
