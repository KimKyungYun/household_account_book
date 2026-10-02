export const PATH = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  CALENDAR: '/calendar',
  TRANSACTIONS: '/transactions',
  TRANSACTION_NEW: '/transactions/new',
  TRANSACTION_DETAIL: (id: string) => `/transactions/${id}`,
  CATEGORIES: '/categories',
  BUDGETS: '/budgets',
  ASSETS: '/assets',
  RECURRINGS: '/recurrings',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const;

/** 거래 화면을 열 때 주소에 싣는 필터 이름. 거래 화면이 처음 열릴 때 이 값을 읽어 건다. */
export const TRANSACTIONS_QUERY = {
  TYPE: 'type',
  CATEGORY: 'category',
  MONTH: 'month',
} as const;

export interface TransactionsFilter {
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  categoryId?: string;
  /** 'YYYY-MM' */
  yearMonth?: string;
}

/** 필터를 건 채로 거래 화면을 여는 주소 — 대시보드의 '전체 보기'와 분류 줄이 쓴다. */
export function transactionsPath(filter: TransactionsFilter): string {
  const search = new URLSearchParams();
  if (filter.type) search.set(TRANSACTIONS_QUERY.TYPE, filter.type);
  if (filter.categoryId) search.set(TRANSACTIONS_QUERY.CATEGORY, filter.categoryId);
  if (filter.yearMonth) search.set(TRANSACTIONS_QUERY.MONTH, filter.yearMonth);
  const query = search.toString();

  return query ? `${PATH.TRANSACTIONS}?${query}` : PATH.TRANSACTIONS;
}
