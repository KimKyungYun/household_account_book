import { http } from '@/service/httpClient';
import type { SettlementDto } from '@/service/settlement/type';

export function getSettlement(yearMonth: string) {
  return http.get<SettlementDto>('/settlement', { yearMonth });
}
