import { http } from '@/service/httpClient';
import type { CopyBudgetInput, PutBudgetsInput } from '@/service/budget/schema';
import type { BudgetMonthDto } from '@/service/budget/type';

export function getBudgetMonth(yearMonth: string) {
  return http.get<BudgetMonthDto>('/budgets', { yearMonth });
}

export function putBudgets(input: PutBudgetsInput) {
  return http.put<{ yearMonth: string }>('/budgets', input);
}

export function copyBudgets(input: CopyBudgetInput) {
  return http.post<{ copied: number }>('/budgets/copy', input);
}
