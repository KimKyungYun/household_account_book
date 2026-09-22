import { http } from '@/service/httpClient';
import type { CreateRecurringInput, UpdateRecurringInput } from '@/service/recurring/schema';
import type { BackfillResult, RecurringRuleDto, RecurringSaveResult } from '@/service/recurring/type';

export function getRecurringRules() {
  return http.get<RecurringRuleDto[]>('/recurring-rules');
}

/** 저장하면 서버가 지난 회차를 바로 거래로 채우고 그 건수를 함께 돌려준다. */
export function createRecurringRule(input: CreateRecurringInput) {
  return http.post<RecurringSaveResult>('/recurring-rules', input);
}

export function updateRecurringRule(id: string, input: UpdateRecurringInput) {
  return http.patch<RecurringSaveResult>(`/recurring-rules/${id}`, input);
}

/** 중지·재개. 규칙은 남아 있어 언제든 되살릴 수 있다. 재개하면 멈춰 있던 회차를 채운다. */
export function setRecurringRuleActive(id: string, isActive: boolean) {
  return http.put<{ backfill: BackfillResult | null }>(`/recurring-rules/${id}`, { isActive });
}

/** 완전 삭제. 이미 만들어진 거래는 남는다. */
export function deleteRecurringRule(id: string) {
  return http.del<{ keptTransactionCount: number }>(`/recurring-rules/${id}`);
}

export function runRecurring() {
  return http.post<BackfillResult>('/recurring-rules/run', {});
}
