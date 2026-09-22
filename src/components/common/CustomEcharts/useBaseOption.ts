'use client';

import formatMoney from '@/utils/ts/formatMoney';
import { useChartColors } from './useChartColors';
import type { EChartsOption } from 'echarts';
import type { ChartColors } from './chartColors';

/** 축·그리드·툴팁의 공통 모양. 차트마다 다르게 보이지 않게 한 곳에서 정한다. */
export function useBaseOption(): { colors: ChartColors; base: EChartsOption } {
  const colors = useChartColors();

  return {
    colors,
    base: {
      grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.border,
        textStyle: { color: colors.textPrimary, fontSize: 12 },
        valueFormatter: (value) => `${formatMoney(Number(value))}원`,
      },
      textStyle: { fontFamily: 'Pretendard, system-ui, sans-serif' },
    },
  };
}
