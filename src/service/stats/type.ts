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
  /** 사용자가 정한 아이콘(이모지). 없으면 화면이 이름으로 골라 준다(categoryEmoji). */
  icon: string | null;
  /** 소분류라면 상위 분류 이름·아이콘. 소분류 칩은 상위 분류의 아이콘을 따른다. 대분류면 null. */
  parentName: string | null;
  parentIcon: string | null;
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
}

/** 달력 한 칸이 필요로 하는 하루치 요약. */
export interface DailyTotalDto {
  /** 'YYYY-MM-DD' */
  date: string;
  income: number;
  expense: number;
  /** 옮긴 돈. 합계에는 넣지 않지만 그 날 무언가 있었다는 표시로 쓴다. */
  transfer: number;
  count: number;
}
