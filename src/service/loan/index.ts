import { http } from '@/service/httpClient';
import type { CreateLoanInput, UpdateLoanInput } from '@/service/loan/schema';
import type { LoanInstallmentDto, LoanSummaryDto } from '@/service/loan/type';

export function getLoans() {
  return http.get<LoanSummaryDto>('/loans');
}

export function getLoanSchedule(id: string) {
  return http.get<LoanInstallmentDto[]>(`/loans/${id}/schedule`);
}

export function createLoan(input: CreateLoanInput) {
  return http.post<{ id: string }>('/loans', input);
}

export function updateLoan(id: string, input: UpdateLoanInput) {
  return http.patch<{ id: string }>(`/loans/${id}`, input);
}

/** 대출만 지운다. 이미 기록된 상환 거래는 남는다. */
export function deleteLoan(id: string) {
  return http.del<{ keptTransactionCount: number }>(`/loans/${id}`);
}
