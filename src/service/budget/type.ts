export type BudgetStatus = 'NO_BUDGET' | 'UNDER' | 'WARNING' | 'OVER';

export interface BudgetRowDto {
  categoryId: string;
  name: string;
  parentName: string | null;
  level: number;
  /** 행이 없으면 null — '미설정'과 '0원 예산'은 다르다. */
  budgetAmount: number | null;
  actualAmount: number;
  remaining: number | null;
  /** 예산이 없으면 null. 화면에서 0/0 = NaN 을 만들지 않게 서버가 정한다. */
  usageRate: number | null;
  status: BudgetStatus;
}

export interface BudgetMonthDto {
  yearMonth: string;
  rows: BudgetRowDto[];
  totals: { budgetAmount: number; actualAmount: number; remaining: number; usageRate: number | null };
}
