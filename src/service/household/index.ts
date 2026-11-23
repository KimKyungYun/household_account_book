import { http } from '@/service/httpClient';
import type { ResetHouseholdInput, UpdateHouseholdInput } from '@/service/household/schema';
import type { ResetCountsDto, ResetSummaryDto } from '@/service/household/type';

export function updateHousehold(input: UpdateHouseholdInput) {
  return http.patch<{ id: string }>('/household', input);
}

export function rotateInviteCode() {
  return http.post<{ inviteCode: string }>('/household/invite/rotate');
}

export function getResetSummary() {
  return http.get<ResetSummaryDto>('/household/reset');
}

export function resetHouseholdData(input: ResetHouseholdInput) {
  return http.post<ResetCountsDto>('/household/reset', input);
}
