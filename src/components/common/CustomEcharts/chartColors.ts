/**
 * 차트 전용 색상. echarts 는 canvas/svg 내부라 CSS 변수를 읽지 못해 hex 로 고정한다.
 *
 * **라이트·다크 두 벌을 둔다.** 한 벌만 두면 CSS 변수를 못 읽었을 때의 폴백이 한쪽 테마에서
 * 축과 그리드를 거의 안 보이게 만든다(이식 원본이 실제로 그랬다).
 * 값은 src/styles/tokens/_semantic.scss 와 함께 고친다.
 */
export interface ChartColors {
  textPrimary: string;
  textSecondary: string;
  axis: string;
  grid: string;
  surface: string;
  border: string;
  income: string;
  expense: string;
  tooltipBg: string;
}

export const CHART_COLORS_LIGHT: ChartColors = {
  textPrimary: '#161a22',
  textSecondary: '#4a5160',
  axis: '#8d96a3',
  grid: '#eceef2',
  surface: '#ffffff',
  border: '#d9dde4',
  income: '#15803d',
  expense: '#e0331b',
  tooltipBg: '#ffffff',
};

export const CHART_COLORS_DARK: ChartColors = {
  textPrimary: '#eef1f5',
  textSecondary: '#b0b6c0',
  axis: '#676d78',
  grid: '#20262e',
  surface: '#181b23',
  border: '#2c333c',
  income: '#00e08a',
  expense: '#ff4d6d',
  tooltipBg: '#1d212a',
};

/**
 * 카테고리 색 팔레트. 라이트·다크 양쪽에서 서로 구분되는 채도로 골랐다.
 * 카테고리에 colorHex 가 지정돼 있으면 그 값이 이기고, 없을 때만 여기서 순서대로 쓴다.
 */
export const CATEGORY_PALETTE = [
  '#1f6feb',
  '#f59e0b',
  '#16a34a',
  '#e0331b',
  '#0ea5e9',
  '#8b5cf6',
  '#d97706',
  '#0d9488',
  '#db2777',
  '#65a30d',
  '#6366f1',
  '#78716c',
] as const;

export function paletteColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] ?? CATEGORY_PALETTE[0];
}
