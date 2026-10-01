/**
 * 대시보드의 분류별 조회 조건. 요약 상자와 '분류별 지출' 카드가 같은 값을 써야
 * 쓴 돈 쪽을 한 번만 받아 온다(같은 queryKey).
 */
export function categoryParamsOf(yearMonth: string, type: 'EXPENSE' | 'INCOME') {
  return { yearMonth, type, level: 1, limit: 8 } as const;
}
