'use client';

import { useMemo } from 'react';
import formatMoney from '@/utils/ts/formatMoney';
import { useChartColors } from './useChartColors';
import type { EChartsOption } from 'echarts';
import type { ChartColors } from './chartColors';

/** 만 원 단위 축약. 축과 값 라벨이 자릿수에 먹히지 않게 한다. */
export function compactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs >= 100_000_000) return `${(value / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`;
  if (abs >= 10_000) return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만`;

  return value.toLocaleString('ko-KR');
}

/**
 * 축·그리드·툴팁의 공통 모양.
 *
 * 차트를 조용하게 만드는 규칙 셋을 여기에 못 박았다.
 *  - **범례를 두지 않는다.** 색이 무엇인지 옆 목록이나 값 라벨이 말한다.
 *  - **세로 축선과 눈금을 지운다.** 가로 격자만 아주 옅게 남긴다.
 *  - **금액은 왼쪽 축에서 읽는다.** 막대 위에 숫자를 얹으면 옆 막대를 덮는다.
 */
export function useBaseOption(): { colors: ChartColors; base: EChartsOption } {
  const colors = useChartColors();

  // 렌더마다 새 객체를 주면 notMerge 로 setOption 이 다시 불려 막대가 자라다 말고
  // 첫 프레임(높이 0)으로 되돌아간다. 실제로 막대가 통째로 안 보이는 버그가 났다.
  const base = useMemo<EChartsOption>(
    () => ({
      // containLabel 은 **축 라벨만** 감싼다. 좌우에 여유가 없으면 회전된 x축 라벨이
      // y축 라벨 위로 올라타고, 위가 붙어 있으면 꺾은선의 점이 잘린다.
      grid: { left: 6, right: 10, top: 18, bottom: 6, containLabel: true },
      tooltip: {
        trigger: 'axis',
        // 툴팁이 차트 상자를 벗어나지 않게 가둔다. 없으면 카드 밖·화면 밖까지 나가
        // 옆 요소를 덮는다 (도넛 왼쪽 조각에서 실제로 화면 끝까지 튀어나갔다).
        confine: true,
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(127, 140, 160, 0.08)' } },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.border,
        borderWidth: 1,
        padding: [8, 12],
        extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.12);',
        textStyle: { color: colors.textPrimary, fontSize: 12 },
        valueFormatter: (value) => `${formatMoney(Number(value))}원`,
      },
      textStyle: { fontFamily: 'Pretendard, system-ui, sans-serif' },
      // 움직임은 EchartsCore 가 정한다 — 처음 그릴 때만 켜고 그 뒤로는 끈다.
    }),
    [colors],
  );

  return { colors, base };
}

/**
 * 가로 격자와 왼쪽 눈금 숫자만 남긴 값 축.
 *
 * 금액은 **막대 위가 아니라 이 축에서** 읽는다. 막대 위 라벨은 라벨 폭이 막대 폭보다
 * 넓어(`100만` 38px vs 막대 20px) 옆 막대를 덮고, 맨 위 막대에서는 잘린다. 축으로
 * 옮기면 폭이 좁아져도 겹칠 것이 없다. 정확한 금액은 툴팁이 말한다.
 */
export function quietValueAxis(colors: ChartColors) {
  return {
    type: 'value' as const,
    splitNumber: 3,
    splitLine: { lineStyle: { color: colors.grid, type: 'dashed' as const } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: colors.textTertiary,
      fontSize: 10,
      formatter: (value: number) => compactMoney(value),
    },
  };
}

/**
 * 축선을 지운 범주 축.
 *
 * 라벨을 기울이면 오른쪽 끝을 눈금에 맞춰 왼쪽 아래로 뻗는다. 그대로 두면 첫 라벨이
 * y축 최하단 숫자와 만나므로(`-300만` 과 `2024.10` 이 겹쳤다) 축에서 더 떨어뜨린다.
 */
export function quietCategoryAxis(colors: ChartColors, data: string[], rotate = 0) {
  return {
    type: 'category' as const,
    data,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      rotate,
      margin: rotate === 0 ? 10 : 14,
      ...(rotate === 0 ? {} : { align: 'right' as const, verticalAlign: 'top' as const }),
      // 범주가 많아 라벨이 서로 닿으면 echarts 가 건너뛰며 그린다. 겹쳐 찍지 않는다.
      hideOverlap: true,
    },
  };
}

/** '#rrggbb' 에 투명도를 붙인다. 다른 형식(rgb() 등)이면 그대로 돌려준다. */
function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim())?.[1];
  if (!hex) return color;

  const [r, g, b] = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 위에서 아래로 옅어지는 막대 색.
 *
 * 꽉 찬 단색 막대 여러 개는 화면에서 무겁다. 끝(위)만 진하고 바닥으로 갈수록 옅게 두면
 * 높이는 그대로 읽히면서 카드가 가벼워진다. `isFocused` 는 이번 달처럼 눈이 먼저 가야 할 막대다.
 */
export function fadingBar(color: string, isFocused = false) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: isFocused
      ? [{ offset: 0, color: withAlpha(color, 1) }, { offset: 1, color: withAlpha(color, 0.45) }]
      : [{ offset: 0, color: withAlpha(color, 0.6) }, { offset: 1, color: withAlpha(color, 0.12) }],
  };
}
