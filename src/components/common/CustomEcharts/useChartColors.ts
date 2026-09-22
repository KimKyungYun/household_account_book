'use client';

import { useMemo } from 'react';
import { useTheme } from '@/stores/themeStore';
import { CHART_COLORS_DARK, CHART_COLORS_LIGHT } from './chartColors';
import type { ChartColors } from './chartColors';

/**
 * 현재 테마의 차트 색을 hex 로 돌려준다.
 *
 * CSS 변수를 읽을 수 있으면 그 값을 쓰고(토큰을 고치면 차트도 따라온다),
 * 못 읽으면 테마에 맞는 폴백 세트로 떨어진다. 브라우저 전용이라 ssr:false 컴포넌트 안에서만 쓴다.
 */
export function useChartColors(): ChartColors {
  const theme = useTheme();

  return useMemo(() => {
    const fallback = theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
    if (typeof window === 'undefined') return fallback;

    const computed = getComputedStyle(document.documentElement);
    const read = (name: string, backup: string) => computed.getPropertyValue(name).trim() || backup;

    return {
      textPrimary: read('--text-primary', fallback.textPrimary),
      textSecondary: read('--text-secondary', fallback.textSecondary),
      textTertiary: read('--text-tertiary', fallback.textTertiary),
      axis: read('--chart-axis', fallback.axis),
      grid: read('--chart-grid', fallback.grid),
      surface: read('--surface-card', fallback.surface),
      border: read('--border-default', fallback.border),
      income: read('--amount-income', fallback.income),
      expense: read('--amount-expense', fallback.expense),
      tooltipBg: read('--surface-card', fallback.tooltipBg),
      memberA: read('--member-a', fallback.memberA),
      memberB: read('--member-b', fallback.memberB),
    };
  }, [theme]);
}
