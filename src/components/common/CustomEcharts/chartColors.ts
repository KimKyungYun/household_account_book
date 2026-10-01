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
  textTertiary: string;
  axis: string;
  grid: string;
  surface: string;
  border: string;
  income: string;
  expense: string;
  tooltipBg: string;
  /** 두 사람의 색 — 구성원을 가르는 자리에만 쓴다. */
  memberA: string;
  memberB: string;
}

export const CHART_COLORS_LIGHT: ChartColors = {
  textPrimary: '#161a22',
  textSecondary: '#4a5160',
  textTertiary: '#6b7380',
  axis: '#cfc3b5',
  grid: '#efe7dd',
  surface: '#fbf7f2',
  border: '#e6dccf',
  income: '#15803d',
  expense: '#e0331b',
  tooltipBg: '#ffffff',
  memberA: '#3b82f6',
  memberB: '#d97706',
};

export const CHART_COLORS_DARK: ChartColors = {
  textPrimary: '#eef1f5',
  textSecondary: '#b0b6c0',
  textTertiary: '#8b929c',
  axis: '#4a3f36',
  grid: '#2a231d',
  surface: '#1b1612',
  border: '#3a3029',
  income: '#00e08a',
  expense: '#ff4d6d',
  tooltipBg: '#221c17',
  memberA: '#74a3de',
  memberB: '#ffb020',
};

/**
 * 카테고리 색 팔레트.
 *
 * 두 사람의 색(파랑·호박)을 양 끝에 두고 그 사이를 건너가도록 골랐다 —
 * 도넛이 앱의 나머지와 한 세트로 보이고, 이웃한 조각끼리도 구분된다.
 * 카테고리에 colorHex 가 지정돼 있으면 그 값이 이기고, 없을 때만 순서대로 쓴다.
 */
export const CATEGORY_PALETTE = [
  '#3b82f6',
  '#d97706',
  '#0ea5e9',
  '#f59e0b',
  '#6366f1',
  '#0d9488',
  '#8b5cf6',
  '#65a30d',
  '#db2777',
  '#0891b2',
  '#a16207',
  '#64748b',
] as const;

export function paletteColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] ?? CATEGORY_PALETTE[0];
}
