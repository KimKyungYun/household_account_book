import { http } from '@/service/httpClient';
import type { CreateTransactionInput, UpdateTransactionInput } from '@/service/transaction/schema';
import type { TransactionListDto } from '@/service/transaction/type';

/** 화면이 들고 있는 필터 상태. 서버 쿼리와 같은 이름을 쓴다. */
export interface TransactionListParams {
  yearMonth?: string;
  from?: string;
  to?: string;
  memberId?: string[];
  categoryId?: string[];
  type?: string[];
  paymentMethodId?: string[];
  splitMode?: string[];
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function getTransactions(params: TransactionListParams) {
  return http.get<TransactionListDto>('/transactions', { ...params });
}

export function createTransaction(input: CreateTransactionInput) {
  return http.post<{ id: string }>('/transactions', input);
}

export function updateTransaction(id: string, input: UpdateTransactionInput) {
  return http.patch<{ id: string }>(`/transactions/${id}`, input);
}

export function deleteTransaction(id: string) {
  return http.del<void>(`/transactions/${id}`);
}
