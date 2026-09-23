/**
 * queryKey 중앙집중.
 * `ALL` 은 배열 리터럴, 하위는 함수 — `invalidateQueries({ queryKey: QUERY_KEY.X.ALL })` 로
 * 계층 무효화가 되는 성질을 유지한다.
 */
export const QUERY_KEY = {
  ME: {
    ALL: ['me'] as const,
    INFO: () => [...QUERY_KEY.ME.ALL] as const,
  },
  HOUSEHOLD: {
    ALL: ['household'] as const,
    INFO: () => [...QUERY_KEY.HOUSEHOLD.ALL, 'info'] as const,
  },
  CATEGORY: {
    ALL: ['category'] as const,
    TREE: (params?: unknown) => [...QUERY_KEY.CATEGORY.ALL, 'tree', params ?? null] as const,
  },
  PAYMENT_METHOD: {
    ALL: ['paymentMethod'] as const,
    LIST: () => [...QUERY_KEY.PAYMENT_METHOD.ALL, 'list'] as const,
  },
  TRANSACTION: {
    ALL: ['transaction'] as const,
    LIST: (params: unknown) => [...QUERY_KEY.TRANSACTION.ALL, 'list', params] as const,
    DETAIL: (id: string) => [...QUERY_KEY.TRANSACTION.ALL, 'detail', id] as const,
  },
  BUDGET: {
    ALL: ['budget'] as const,
    MONTH: (yearMonth: string) => [...QUERY_KEY.BUDGET.ALL, 'month', yearMonth] as const,
  },
  RECURRING: {
    ALL: ['recurring'] as const,
    LIST: () => [...QUERY_KEY.RECURRING.ALL, 'list'] as const,
    PREVIEW: (id: string, months: number) => [...QUERY_KEY.RECURRING.ALL, 'preview', id, months] as const,
  },
  STATS: {
    ALL: ['stats'] as const,
    OVERVIEW: (yearMonth: string) => [...QUERY_KEY.STATS.ALL, 'overview', yearMonth] as const,
    MONTHLY: (params: unknown) => [...QUERY_KEY.STATS.ALL, 'monthly', params] as const,
    CATEGORIES: (params: unknown) => [...QUERY_KEY.STATS.ALL, 'categories', params] as const,
    MEMBERS: (params: unknown) => [...QUERY_KEY.STATS.ALL, 'members', params] as const,
  },
} as const;
