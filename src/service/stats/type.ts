export interface MonthlyPointDto {
  yearMonth: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryShareDto {
  categoryId: string;
  name: string;
  colorHex: string | null;
  amount: number;
  /** 0~1 */
  share: number;
  prevAmount: number;
}

export interface MemberStatDto {
  memberId: string;
  displayName: string;
  colorHex: string;
  paidIncome: number;
  paidExpense: number;
  sharedPaid: number;
  personalPaid: number;
}

export interface OverviewDto {
  yearMonth: string;
  income: number;
  expense: number;
  net: number;
  prev: { income: number; expense: number; net: number };
  /** 전월 대비 지출 증감. 전월이 0이면 null. */
  expenseDeltaRate: number | null;
  pendingCount: number;
}
