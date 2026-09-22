import { http } from '@/service/httpClient';
import type { CreateRecurringInput, UpdateRecurringInput } from '@/service/recurring/schema';
import type { RecurringRuleDto } from '@/service/recurring/type';

export function getRecurringRules() {
  return http.get<RecurringRuleDto[]>('/recurring-rules');
}

export function createRecurringRule(input: CreateRecurringInput) {
  return http.post<{ id: string }>('/recurring-rules', input);
}

export function updateRecurringRule(id: string, input: UpdateRecurringInput) {
  return http.patch<{ id: string }>(`/recurring-rules/${id}`, input);
}

export function deactivateRecurringRule(id: string) {
  return http.del<void>(`/recurring-rules/${id}`);
}

export function runRecurring() {
  return http.post<{ created: number; pending: number; skipped: number }>('/recurring-rules/run', {});
}
